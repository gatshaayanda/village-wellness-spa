import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";
import { trippleSServiceSeed } from "@/lib/tripple-s/catalog";
export const dynamic = "force-dynamic";

function gaboroneToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 }); }

  const authorization = request.headers.get("authorization");
  const customer = authorization ? await requireCustomer(request) : null;
  if (authorization && !customer) return NextResponse.json({ error: "Your customer session expired. Please retry your request." }, { status: 401 });

  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const email = String(body.email ?? customer?.email ?? "").trim().slice(0, 200);
  const preferredDate = String(body.preferredDate ?? "").trim();
  const preferredTime = String(body.preferredTime ?? "").trim();
  const serviceId = String(body.serviceId ?? "").trim();
  const message = String(body.message ?? "").trim().slice(0, 1500);
  const clientType = body.clientType === "RETURNING" ? "RETURNING" : "NEW";

  if (!name || !phone) return NextResponse.json({ error: "Enter your name and mobile number so the team can contact you." }, { status: 400 });
  if (preferredDate) {
    const parsed = new Date(preferredDate + "T12:00:00+02:00");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== preferredDate || preferredDate < gaboroneToday()) {
      return NextResponse.json({ error: "Choose today or a future date, or leave the date open for any suitable opening." }, { status: 400 });
    }
  }
  if (preferredTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) return NextResponse.json({ error: "Choose a valid preferred time or leave it flexible." }, { status: 400 });

  try {
    const db = getAdminDb();
    let service: Record<string, unknown> | null = null;
    if (serviceId) {
      const serviceSnap = await db.collection("services").doc(serviceId).get();
      service = serviceSnap.exists ? serviceSnap.data() ?? null : trippleSServiceSeed.find((item) => item.id === serviceId) ?? null;
      if (!service || service.active === false) return NextResponse.json({ error: "That treatment is no longer available. Please choose another." }, { status: 409 });
    }

    const reference = db.collection("bookingRequests").doc();
    const createdAt = new Date().toISOString();
    const payload = {
      createdAt,
      ...(customer ? { customerUid: customer.uid } : {}),
      name,
      phone,
      ...(email ? { email } : {}),
      ...(serviceId ? { serviceId } : {}),
      serviceNameSnapshot: String(service?.name ?? "Flexible treatment / help choosing"),
      ...(service ? { priceSnapshot: String(service.price ?? ""), durationSnapshot: String(service.duration ?? "") } : {}),
      ...(preferredDate ? { preferredDate } : {}),
      ...(preferredTime ? { preferredTime } : {}),
      clientType,
      requestType: "WAITLIST",
      status: "NEW",
      paymentStatus: "PAYMENT_PENDING",
      ...(message ? { message } : {}),
    };
    await reference.set(payload);

    if (customer) {
      await db.collection("customerProfiles").doc(customer.uid).set({
        uid: customer.uid, name, phone, ...(email ? { email } : {}), updatedAt: createdAt,
      }, { merge: true });
    }
    return NextResponse.json({ id: reference.id, reference: reference.id.slice(0, 8).toUpperCase() }, { status: 201 });
  } catch (error) {
    console.error("[Village Wellness Spa] waitlist request save failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "We could not save your waitlist request. Please try again shortly." }, { status: 503 });
  }
}
