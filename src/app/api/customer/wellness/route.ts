import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const collectionName = "customerWellness";
type JournalEntry = { id: string; text: string; createdAt: string };
type WellnessRecord = { garden?: { growth?: number; checkinDays?: string[]; lastRitualAt?: string }; journal?: JournalEntry[] };
const todayInCanada = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Mississauga", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const safeState = (data: WellnessRecord | undefined) => ({
  garden: {
    growth: Math.max(0, Math.min(30, Number(data?.garden?.growth ?? 0))),
    checkinDays: Array.isArray(data?.garden?.checkinDays) ? data!.garden!.checkinDays!.filter((day): day is string => typeof day === "string").slice(-30) : [],
    lastRitualAt: typeof data?.garden?.lastRitualAt === "string" ? data.garden.lastRitualAt : "",
  },
  journal: Array.isArray(data?.journal) ? data.journal.filter((entry): entry is JournalEntry => !!entry && typeof entry.id === "string" && typeof entry.text === "string" && typeof entry.createdAt === "string").slice(0, 60) : [],
});

export async function GET(request: NextRequest) {
  const customer = await requireCustomer(request);
  if (!customer) return NextResponse.json({ error: "Sign in to access your private wellness space." }, { status: 401 });
  try {
    const snapshot = await getAdminDb().collection(collectionName).doc(customer.uid).get();
    return NextResponse.json(safeState(snapshot.exists ? snapshot.data() as WellnessRecord : undefined), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] wellness data unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Your wellness space is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const customer = await requireCustomer(request);
  if (!customer) return NextResponse.json({ error: "Sign in to save to your private wellness space." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Check the details and try again." }, { status: 400 }); }
  const action = String(body.action ?? "");
  try {
    const db = getAdminDb();
    const ref = db.collection(collectionName).doc(customer.uid);
    if (action === "journal") {
      const text = String(body.text ?? "").trim();
      if (!text || text.length > 500) return NextResponse.json({ error: "Write a reflection of 1–500 characters." }, { status: 400 });
      const entry: JournalEntry = { id: randomUUID(), text, createdAt: new Date().toISOString() };
      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const current = safeState(snapshot.exists ? snapshot.data() as WellnessRecord : undefined);
        if (current.journal.length >= 60) throw new Error("JOURNAL_LIMIT");
        transaction.set(ref, { journal: [entry, ...current.journal], updatedAt: new Date().toISOString() }, { merge: true });
      });
      const snapshot = await ref.get();
      return NextResponse.json(safeState(snapshot.data() as WellnessRecord).journal, { status: 201 });
    }
    if (action === "deleteJournal") {
      const entryId = String(body.entryId ?? "").slice(0, 80);
      if (!entryId) return NextResponse.json({ error: "Choose a journal entry to delete." }, { status: 400 });
      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const current = safeState(snapshot.exists ? snapshot.data() as WellnessRecord : undefined);
        transaction.set(ref, { journal: current.journal.filter(entry => entry.id !== entryId), updatedAt: new Date().toISOString() }, { merge: true });
      });
      const snapshot = await ref.get();
      return NextResponse.json(safeState(snapshot.data() as WellnessRecord).journal);
    }
    if (action === "ritual") {
      const today = todayInCanada();
      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const current = safeState(snapshot.exists ? snapshot.data() as WellnessRecord : undefined);
        if (current.garden.checkinDays.includes(today)) throw new Error("RITUAL_ALREADY_DONE");
        const checkinDays = [...current.garden.checkinDays, today].slice(-30);
        transaction.set(ref, { garden: { growth: Math.min(30, current.garden.growth + 1), checkinDays, lastRitualAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }, { merge: true });
      });
      const snapshot = await ref.get();
      return NextResponse.json(safeState(snapshot.data() as WellnessRecord).garden);
    }
    return NextResponse.json({ error: "Choose a supported wellness action." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "JOURNAL_LIMIT") return NextResponse.json({ error: "Your journal has reached its 60-entry limit. Delete an older entry to make room." }, { status: 409 });
    if (error instanceof Error && error.message === "RITUAL_ALREADY_DONE") return NextResponse.json({ error: "You have already tended your garden today. Come back whenever it suits you." }, { status: 409 });
    console.error("[Village Wellness Spa] wellness update failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "That update could not be saved. Please try again." }, { status: 503 });
  }
}
