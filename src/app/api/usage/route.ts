import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const events = new Set(["page_view", "booking_start", "availability_result", "booking_submit_success", "booking_conflict", "enquiry_submit_success"]);
const categories = new Set(["home", "treatments", "treatment_detail", "products", "booking", "account", "other"]);
const sources = new Set(["direct", "search", "social", "referral"]);
const devices = new Set(["mobile", "tablet", "desktop"]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.nextUrl.host) return NextResponse.json({ error: "Same-origin telemetry only." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const event = String(body.event ?? "");
    if (!events.has(event)) return NextResponse.json({ error: "Unsupported usage event." }, { status: 400 });
    const category = categories.has(String(body.category)) ? String(body.category) : "other";
    const outcome = ["available", "empty", "error"].includes(String(body.outcome)) ? String(body.outcome) : "";
    const source = sources.has(String(body.source)) ? String(body.source) : "direct";
    const device = devices.has(String(body.device)) ? String(body.device) : "desktop";
    const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

    await getAdminDb().collection("usageDaily").doc(today).set({
      date: today,
      ...increments,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("[Village Wellness Spa] usage event could not be recorded", error instanceof Error ? error.message : "unknown");
    // Analytics must never block the customer journey.
    return NextResponse.json({ ok: false }, { status: 202, headers: { "Cache-Control": "no-store" } });
  }
}
