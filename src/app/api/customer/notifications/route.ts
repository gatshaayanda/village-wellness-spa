import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";
export const dynamic = "force-dynamic";
const tokenId = (token: string) => createHash("sha256").update(token).digest("hex");
export async function GET(request: NextRequest) {
 const customer = await requireCustomer(request);
 if (!customer) return NextResponse.json({ error: "Sign in to manage notification preferences." }, { status: 401 });
 try {
  const db = getAdminDb();
  const [preferenceSnapshot, tokenSnapshot] = await Promise.all([
   db.collection("notificationPreferences").doc(customer.uid).get(),
   db.collection("notificationTokens").doc(customer.uid).collection("devices").get(),
  ]);
  const saved = preferenceSnapshot.data() ?? {};
  return NextResponse.json({ preferences: { enabled: saved.enabled === true, appointmentUpdates: saved.appointmentUpdates !== false, offersAndNews: saved.offersAndNews === true, updatedAt: String(saved.updatedAt ?? "") }, registered: tokenSnapshot.size > 0 });
 } catch (error) {
  console.error("[Village Wellness Spa] notification preferences unavailable", error instanceof Error ? error.message : "unknown");
  return NextResponse.json({ error: "Notification preferences are temporarily unavailable." }, { status: 503 });
 }
}
export async function POST(request: NextRequest) {
 const customer = await requireCustomer(request);
 if (!customer) return NextResponse.json({ error: "Your session expired. Refresh My Village Wellness Spa and try again." }, { status: 401 });
 let body: Record<string, unknown>;
 try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Check your notification choices and try again." }, { status: 400 }); }
 if ((body.appointmentUpdates !== undefined && typeof body.appointmentUpdates !== "boolean") ||
     (body.offersAndNews !== undefined && typeof body.offersAndNews !== "boolean") ||
     (body.enabled !== undefined && typeof body.enabled !== "boolean") ||
     (body.deviceToken !== undefined && (typeof body.deviceToken !== "string" || body.deviceToken.length < 20 || body.deviceToken.length > 4096))) {
  return NextResponse.json({ error: "Those notification settings are not valid." }, { status: 400 });
 }
 try {
  const db = getAdminDb(), preferenceRef = db.collection("notificationPreferences").doc(customer.uid);
  const [previous, existingTokens] = await Promise.all([preferenceRef.get(), db.collection("notificationTokens").doc(customer.uid).collection("devices").get()]);
  const old = previous.data() ?? {};
  const token = typeof body.deviceToken === "string" ? body.deviceToken : "";
  if (body.enabled === true && !token && existingTokens.empty) return NextResponse.json({ error: "Register this device before enabling push notifications." }, { status: 409 });
  if (token) {
   await db.collection("notificationTokens").doc(customer.uid).collection("devices").doc(tokenId(token)).set({ token, updatedAt: new Date().toISOString() });
  }
  const preferences = {
   enabled: body.enabled === undefined ? old.enabled === true : body.enabled,
   appointmentUpdates: body.appointmentUpdates === undefined ? old.appointmentUpdates !== false : body.appointmentUpdates,
   offersAndNews: body.offersAndNews === undefined ? old.offersAndNews === true : body.offersAndNews,
   updatedAt: new Date().toISOString(),
  };
  await preferenceRef.set(preferences, { merge: true });
  return NextResponse.json({ preferences, registered: Boolean(token) || !existingTokens.empty });
 } catch (error) {
  console.error("[Village Wellness Spa] notification preferences save failed", error instanceof Error ? error.message : "unknown");
  return NextResponse.json({ error: "Your notification choices could not be saved. Please try again." }, { status: 503 });
 }
}
