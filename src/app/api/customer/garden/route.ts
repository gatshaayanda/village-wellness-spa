import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
type Plant = { id: string; growth: number; plantedAt: string; lastWateredDate: string };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const cleanPlants = (value: unknown): Plant[] => Array.isArray(value) ? value.filter((item): item is Plant => Boolean(item && typeof item.id === "string")).map(item => ({
  id: item.id,
  growth: Math.max(0, Math.min(5, Number(item.growth) || 0)),
  plantedAt: String(item.plantedAt ?? ""),
  lastWateredDate: String(item.lastWateredDate ?? ""),
})) : [];
async function paidVisitCount(uid: string) {
  const snapshot = await getAdminDb().collection("bookingRequests").where("customerUid", "==", uid).get();
  return snapshot.docs.filter(item => item.data().status === "COMPLETED" && item.data().paymentStatus === "PAID").length;
}
export async function GET(request: NextRequest) {
  const customer = await requireCustomer(request);
  if (!customer) return NextResponse.json({ error: "Sign in to open your private garden." }, { status: 401 });
  try {
    const db = getAdminDb();
    const [garden, visits] = await Promise.all([
      db.collection("customerProfiles").doc(customer.uid).collection("garden").doc("current").get(),
      paidVisitCount(customer.uid),
    ]);
    const plants = cleanPlants(garden.data()?.plants);
    return NextResponse.json({ plants, paidVisitCount: visits, seedsAvailable: Math.max(0, visits + 1 - plants.length), today: today() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] garden load failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Your garden could not be loaded right now." }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  const customer = await requireCustomer(request);
  if (!customer) return NextResponse.json({ error: "Sign in to tend your private garden." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Choose a garden action." }, { status: 400 }); }
  const action = String(body.action ?? ""), plantId = String(body.plantId ?? "");
  if (!["plant", "water"].includes(action)) return NextResponse.json({ error: "Choose plant or water." }, { status: 400 });
  try {
    const db = getAdminDb(), ref = db.collection("customerProfiles").doc(customer.uid).collection("garden").doc("current");
    const visits = await paidVisitCount(customer.uid), date = today(), now = new Date().toISOString();
    let plants: Plant[] = [];
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      plants = cleanPlants(snapshot.data()?.plants);
      if (action === "plant") {
        if (plants.length >= visits + 1) throw new Error("NO_SEEDS");
        plants.push({ id: randomUUID(), growth: 0, plantedAt: now, lastWateredDate: "" });
      } else {
        const index = plants.findIndex(item => item.id === plantId);
        if (index < 0) throw new Error("PLANT_NOT_FOUND");
        if (plants[index].growth >= 5) throw new Error("ALREADY_BLOOMED");
        if (plants[index].lastWateredDate === date) throw new Error("ALREADY_WATERED");
        plants[index] = { ...plants[index], growth: Math.min(5, plants[index].growth + 1), lastWateredDate: date };
      }
      transaction.set(ref, { plants, updatedAt: now }, { merge: true });
    });
    return NextResponse.json({ ok: true, plants, paidVisitCount: visits, seedsAvailable: Math.max(0, visits + 1 - plants.length), today: date }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errors: Record<string, string> = {
      NO_SEEDS: "Your garden needs another completed paid visit before you can plant another seed.",
      PLANT_NOT_FOUND: "That plant could not be found. Refresh your garden and try again.",
      ALREADY_BLOOMED: "This flower is already in bloom.",
      ALREADY_WATERED: "You have watered this plant today. Come back another day if you want to tend it again.",
    };
    return NextResponse.json({ error: errors[message] || "Your garden action could not be saved." }, { status: message === "PLANT_NOT_FOUND" ? 404 : 409 });
  }
}
