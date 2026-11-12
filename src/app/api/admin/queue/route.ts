import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
type VisitRecord = Record<string, unknown> & { id: string };
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
    const walkInRecords: VisitRecord[] = walkIns.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const walkInItems: VisitRecord[] = walkInRecords
      .filter(item => String(item.visitDate ?? item.preferredDate ?? "") === date && item.status !== "ON_THE_WAY")
      .map(item => ({ ...item, status: item.queueMode === "CUSTOMER" && item.status === "WAITING" ? "WAITING" : ["WAITING", "IN_TREATMENT"].includes(String(item.status)) ? "ARRIVED" : String(item.status ?? "") }));
    const appointmentRecords: VisitRecord[] = appointments.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const appointmentItems: VisitRecord[] = appointmentRecords.filter(item =>
      item.requestType !== "QUEUE" && item.requestType !== "WAITLIST" && (!item.requestType || item.requestType === "APPOINTMENT") && ["CONFIRMED", "ARRIVED", "COMPLETED"].includes(String(item.status ?? ""))
    );
    const items = [...walkInItems, ...appointmentItems].sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
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
      let name = String(body.name ?? "").trim().slice(0, 120);
      const phone = String(body.phone ?? "").trim().slice(0, 40);
      const serviceName = String(body.serviceName ?? "").trim().slice(0, 160);
      if (!phone || !serviceName) return NextResponse.json({ error: "Enter the customer's WhatsApp number and choose the treatment." }, { status: 400 });
      const now = new Date().toISOString(), ref = db.collection("bookingRequests").doc();
      const normalizePhone = (value: unknown) => {
        const digits = String(value ?? "").replace(/\D/g, "");
        return digits.startsWith("267") ? digits : digits.startsWith("0") ? "267" + digits.slice(1) : digits.length === 8 ? "267" + digits : digits;
      };
      const normalizedPhone = normalizePhone(phone);
      const matches = await db.collection("customerProfiles").get();
      const samePhone = matches.docs.filter(doc => normalizePhone(doc.data().phone) === normalizedPhone);
      const exact = name
        ? samePhone.filter(doc => String(doc.data().name ?? "").trim().toLocaleLowerCase() === name.toLocaleLowerCase())
        : samePhone;
      if (!name && exact.length === 1) name = String(exact[0].data().name ?? "").trim();
      if (!name && exact.length === 0) return NextResponse.json({ error: "New customer: enter their name once. It will be saved with this visit." }, { status: 400 });
      if (!name && exact.length > 1) return NextResponse.json({ error: "More than one account uses this number. Enter the customer's name to identify the correct profile." }, { status: 409 });
      const customerUid = exact.length === 1 ? exact[0].id : "";
      const claimToken = customerUid ? "" : randomBytes(32).toString("hex");
      const claimTokenHash = claimToken ? createHash("sha256").update(claimToken).digest("hex") : "";
      await ref.set({
        createdAt: now, visitDate: today(), preferredDate: today(), name, phone: normalizedPhone, phoneNormalized: normalizedPhone,
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
        if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) throw new Error("INVALID_FINAL_PRICE");
        const paymentMethod = String(body.paymentMethod ?? "").trim();
        if (!["CASH", "ORANGE_MONEY", "CARD", "OTHER"].includes(paymentMethod)) throw new Error("INVALID_PAYMENT_METHOD");
        patch.completedAt = now;
        patch.finalPriceSnapshot = "P" + Number(price).toFixed(2);
        patch.paymentStatus = "PAID";
        patch.paymentMethod = paymentMethod;
        patch.paymentRecordedAt = now;
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
      INVALID_PAYMENT_METHOD: "Choose how the customer paid before completing the visit.",
      INVALID_RETURN_DATE: "Choose a valid recommended return date.",
    };
    return NextResponse.json({ error: errors[message] || "The visit update could not be saved." }, { status: message === "NOT_FOUND" ? 404 : 400 });
  }
}
