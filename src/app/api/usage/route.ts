import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const events = new Set([
  "page_view", "booking_start", "availability_result", "booking_submit_success",
  "booking_conflict", "enquiry_submit_success", "walkin_registered", "visit_completed",
  "walkin_queue_start", "walkin_queue_join_success", "treatment_selected",
]);
const categories = new Set(["home", "treatments", "treatment_detail", "products", "booking", "queue", "account", "other"]);
const sources = new Set(["direct", "search", "social", "referral"]);
const devices = new Set(["mobile", "tablet", "desktop"]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.nextUrl.host) {
      return NextResponse.json({ error: "Same-origin telemetry only." }, { status: 403 });
    }
    const body = await request.json() as Record<string, unknown>;
    const event = String(body.event ?? "");
    if (!events.has(event)) return NextResponse.json({ error: "Unsupported usage event." }, { status: 400 });

    const category = categories.has(String(body.category)) ? String(body.category) : "other";
    const outcome = ["available", "empty", "error"].includes(String(body.outcome)) ? String(body.outcome) : "";
    const source = sources.has(String(body.source)) ? String(body.source) : "direct";
    const device = devices.has(String(body.device)) ? String(body.device) : "desktop";
    const createdAt = new Date().toISOString();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());

    const record = {
      event,
      category,
      ...(outcome ? { outcome } : {}),
      ...(body.firstSession === true ? { firstSession: true, source, device } : {}),
      createdAt,
    };
    const payloadBytes = Buffer.byteLength(JSON.stringify(record), "utf8");
    const increments: Record<string, FirebaseFirestore.FieldValue> = {};
    const increment = (key: string) => { increments[key] = FieldValue.increment(1); };

    if (event === "page_view") {
      increment("pageViews");
      increment("views_" + category);
      if (body.firstSession === true) {
        increment("estimatedSessions");
        increment("source_" + source);
        increment("device_" + device);
      }
    } else if (event === "booking_start") increment("bookingStarts");
    else if (event === "availability_result") {
      increment("availabilityChecks");
      if (outcome === "empty") increment("availabilityEmpty");
      if (outcome === "error") increment("availabilityErrors");
    } else if (event === "booking_submit_success") increment("bookingSubmissions");
    else if (event === "booking_conflict") increment("bookingConflicts");
    else if (event === "enquiry_submit_success") increment("enquiries");
    else if (event === "walkin_registered") increment("walkInsRegistered");
    else if (event === "visit_completed") increment("visitsCompleted");
    else if (event === "walkin_queue_start") increment("walkInQueueStarts");
    else if (event === "walkin_queue_join_success") {
      increment("walkInsJoined");
      increment("walkInsRegistered");
    } else if (event === "treatment_selected") increment("treatmentSelections");

    increment("eventCount");
    increments.payloadBytes = FieldValue.increment(payloadBytes);
    increments.firebaseWrites = FieldValue.increment(2);

    const db = getAdminDb();
    const eventRef = db.collection("usageEvents").doc();
    const dailyRef = db.collection("usageDaily").doc(today);
    await db.runTransaction(async transaction => {
      transaction.create(eventRef, { ...record, payloadBytes });
      transaction.set(dailyRef, {
        date: today,
        ...increments,
        updatedAt: createdAt,
      }, { merge: true });
    });

    return NextResponse.json({ ok: true, payloadBytes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("[Village Wellness Spa] usage event could not be recorded", error instanceof Error ? error.message : "unknown");
    // Analytics must never block the customer journey. The browser keeps a local-only event copy.
    return NextResponse.json({ ok: false }, { status: 202, headers: { "Cache-Control": "no-store" } });
  }
}
