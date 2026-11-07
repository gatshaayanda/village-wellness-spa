import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const allowed = new Set(["ARRIVED", "COMPLETED"]);
function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Sign in with an authorized staff account." }, { status: 401 });
  try {
    const db = getAdminDb(), date = today();
    const [walkIns, appointments] = await Promise.all([
      db.collection("bookingRequests").where("requestType", "==", "QUEUE").get(),
      db.collection("bookingRequests").where("preferredDate", "==", date).get(),
    ]);
    const walkInItems = walkIns.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((item: any) => String(item.visitDate ?? item.preferredDate ?? "") === date && item.status !== "ON_THE_WAY").map((item: any) => ({ ...item, status: ["WAITING", "IN_TREATMENT"].includes(String(item.status)) ? "ARRIVED" : item.status }));
    const appointmentItems = appointments.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((item: any) =>
      item.requestType !== "QUEUE" && item.requestType !== "WAITLIST" && (!item.requestType || item.requestType === "APPOINTMENT") && ["CONFIRMED", "ARRIVED", "COMPLETED"].includes(String(item.status ?? ""))
    );
    const items = [...walkInItems, ...appointmentItems].sort((a: any, b: any) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[Village Wellness Spa] visits load failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Today's visits could not be loaded." }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Sign in with an authorized staff account." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid visit update." }, { status: 400 }); }
  const db = getAdminDb(), action = String(body.action ?? "update");
  try {
    if (action === "create") {
      const name = String(body.name ?? "").trim().slice(0, 120);
      const phone = String(body.phone ?? "").trim().slice(0, 40);
      const serviceName = String(body.serviceName ?? "").trim().slice(0, 160);
      if (!name || !phone || !serviceName) return NextResponse.json({ error: "Choose the treatment and enter the customer's name and mobile number." }, { status: 400 });
      const now = new Date().toISOString(), ref = db.collection("bookingRequests").doc();
      const digits = phone.replace(/\D/g, "");
      const normalizedPhone = digits.startsWith("267") ? digits : digits.startsWith("0") ? "267" + digits.slice(1) : digits.length === 8 ? "267" + digits : digits;
      const matches = await db.collection("customerProfiles").get();
      const exact = matches.docs.filter(doc => {
        const profile = doc.data();
        const profileDigits = String(profile.phone ?? "").replace(/\D/g, "");
        const profilePhone = profileDigits.startsWith("267") ? profileDigits : profileDigits.startsWith("0") ? "267" + profileDigits.slice(1) : profileDigits.length === 8 ? "267" + profileDigits : profileDigits;
        return profilePhone === normalizedPhone && String(profile.name ?? "").trim().toLocaleLowerCase() === name.toLocaleLowerCase();
      });
      const customerUid = exact.length === 1 ? exact[0].id : "";
      const claimToken = customerUid ? "" : randomBytes(32).toString("hex");
      const claimTokenHash = claimToken ? createHash("sha256").update(claimToken).digest("hex") : "";
      await ref.set({
        createdAt: now, visitDate: today(), preferredDate: today(), name, phone: normalizedPhone,
        ...(customerUid ? { customerUid, profileConnected: true } : {}),
        serviceNameSnapshot: serviceName, requestType: "QUEUE", queueMode: "STAFF",
        status: "ARRIVED", statusUpdatedAt: now, paymentStatus: "NOT_RECORDED",
        createdBy: "STAFF",
        ...(claimTokenHash ? { customerClaimTokenHash: claimTokenHash, customerClaimExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : {}),
      });
      return NextResponse.json({ id: ref.id, reference: ref.id.slice(0, 8).toUpperCase(), ...(claimToken ? { claimToken } : {}), linkedToExistingAccount: Boolean(customerUid) }, { status: 201 });
    }
    const id = String(body.id ?? ""), status = String(body.status ?? "");
    if (!id || !allowed.has(status)) return NextResponse.json({ error: "A visit can only be marked Arrived or Completed." }, { status: 400 });
    const ref = db.collection("bookingRequests").doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data() ?? {};
      const requestType = String(data.requestType ?? "APPOINTMENT");
      if (requestType === "WAITLIST") throw new Error("RETIRED_WAITLIST");
      const current = String(data.status ?? "");
      const canArrive = status === "ARRIVED" && requestType === "APPOINTMENT" && current === "CONFIRMED";
      const canComplete = status === "COMPLETED" && (current === "ARRIVED" || current === "WAITING" || current === "IN_TREATMENT"); // Legacy intermediate states remain completable; new visits use ARRIVED → COMPLETED only.
      if (!(canArrive || canComplete)) throw new Error("INVALID_TRANSITION");
      const now = new Date().toISOString(), patch: Record<string, unknown> = { status, statusUpdatedAt: now };
      if (status === "COMPLETED") {
        const price = String(body.finalPrice ?? "").trim().replace(/^P\s*/i, "");
        patch.completedAt = now;
        if (price) {
          if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) throw new Error("INVALID_FINAL_PRICE");
          patch.finalPriceSnapshot = "P" + Number(price).toFixed(2);
          patch.paymentStatus = "PAID";
          patch.paymentRecordedAt = now;
        }
        const date = String(body.recommendedReturnDate ?? "").trim();
        const note = String(body.returnNote ?? "").trim().slice(0, 500);
        if (date) {
          const parsed = new Date(date + "T12:00:00+02:00");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("INVALID_RETURN_DATE");
          patch.recommendedReturnDate = date;
        }
        if (note) patch.returnNote = note;
      }
      tx.update(ref, patch);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errors: Record<string, string> = {
      NOT_FOUND: "That visit could not be found.",
      RETIRED_WAITLIST: "Waitlist records are no longer part of the visit workflow.",
      INVALID_TRANSITION: "This visit cannot make that change. Refresh the list and check its current status.",
      INVALID_FINAL_PRICE: "Enter the actual amount received in pula.",
      INVALID_RETURN_DATE: "Choose a valid recommended return date.",
    };
    return NextResponse.json({ error: errors[message] || "The visit update could not be saved." }, { status: message === "NOT_FOUND" ? 404 : 400 });
  }
}
