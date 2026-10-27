import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const customer = await requireCustomer(request);
  if (!customer) return NextResponse.json({ error: "Sign in to load your saved contact details." }, { status: 401 });
  try {
    const db = getAdminDb();
    const [profileSnap, bookingsSnap] = await Promise.all([
      db.collection("customerProfiles").doc(customer.uid).get(),
      db.collection("bookingRequests").where("customerUid", "==", customer.uid).get(),
    ]);
    const saved = profileSnap.data() ?? {};
    const bookings = bookingsSnap.docs
      .map((document) => document.data())
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    const latest = bookings[0] ?? {};
    return NextResponse.json({
      name: String(saved.name ?? latest.name ?? ""),
      phone: String(saved.phone ?? latest.phone ?? ""),
      email: String(saved.email ?? latest.email ?? customer.email ?? ""),
      profileConnected: Boolean(saved.profileConnected),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] customer profile load failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Your saved contact details are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const customer = await requireCustomer(request);
  if (!customer) return NextResponse.json({ error: "Sign in to secure your Village Wellness Spa profile." }, { status: 401 });
  if (!customer.email) return NextResponse.json({ error: "Connect a Google account with an email address first." }, { status: 400 });
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const profile = db.collection("customerProfiles").doc(customer.uid);
    await profile.set({ uid: customer.uid, email: customer.email.slice(0, 200), profileConnected: true, updatedAt: now }, { merge: true });
    const bookings = await db.collection("bookingRequests").where("customerUid", "==", customer.uid).limit(20).get();
    if (!bookings.empty) {
      const batch = db.batch();
      for (const booking of bookings.docs) batch.set(booking.ref, { email: customer.email.slice(0, 200), profileConnected: true, profileUpdatedAt: now }, { merge: true });
      await batch.commit();
    }
    return NextResponse.json({ connected: true, updatedRequests: bookings.size }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] customer profile sync failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Your profile connected, but the request details could not be updated. Please contact the clinic if needed." }, { status: 503 });
  }
}
