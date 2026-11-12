import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Sign in with an authorized staff account." }, { status: 401 });
  const requested = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const days = requested === 7 ? 7 : 30;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const startDate = new Date(today + "T12:00:00Z");
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  const start = startDate.toISOString().slice(0, 10);
  try {
    const db = getAdminDb();
    const [snapshot, recentSnapshot] = await Promise.all([
      db.collection("usageDaily").where("date", ">=", start).where("date", "<=", today).orderBy("date", "asc").get(),
      db.collection("usageEvents").orderBy("createdAt", "desc").limit(100).get(),
    ]);
    const rows = snapshot.docs.map(item => {
      const data = item.data();
      const number = (key: string) => Number(data[key] ?? 0);
      return {
        date: String(data.date ?? item.id),
        pageViews: number("pageViews"),
        estimatedSessions: number("estimatedSessions"),
        views_home: number("views_home"),
        views_treatments: number("views_treatments"),
        views_treatment_detail: number("views_treatment_detail"),
        views_products: number("views_products"),
        views_booking: number("views_booking"),
        views_queue: number("views_queue"),
        views_account: number("views_account"),
        views_other: number("views_other"),
        source_direct: number("source_direct"),
        source_search: number("source_search"),
        source_social: number("source_social"),
        source_referral: number("source_referral"),
        device_mobile: number("device_mobile"),
        device_tablet: number("device_tablet"),
        device_desktop: number("device_desktop"),
        bookingStarts: number("bookingStarts"),
        availabilityChecks: number("availabilityChecks"),
        availabilityEmpty: number("availabilityEmpty"),
        availabilityErrors: number("availabilityErrors"),
        bookingSubmissions: number("bookingSubmissions"),
        bookingConflicts: number("bookingConflicts"),
        enquiries: number("enquiries"),
        walkInQueueStarts: number("walkInQueueStarts"),
        walkInsJoined: number("walkInsJoined"),
        walkInsRegistered: number("walkInsRegistered"),
        treatmentSelections: number("treatmentSelections"),
        visitsCompleted: number("visitsCompleted"),
        eventCount: number("eventCount"),
        payloadBytes: number("payloadBytes"),
        firebaseWrites: number("firebaseWrites"),
      };
    });
    const recentEvents = recentSnapshot.docs.map(item => {
      const data = item.data();
      return {
        id: item.id,
        event: String(data.event ?? "activity"),
        category: String(data.category ?? "other"),
        ...(data.outcome ? { outcome: String(data.outcome) } : {}),
        createdAt: String(data.createdAt ?? ""),
        payloadBytes: Number(data.payloadBytes ?? 0),
      };
    });
    return NextResponse.json({ days, start, end: today, rows, recentEvents, referenceCeilingBytes: 25_000_000_000 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] usage summary unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Usage insights could not be loaded." }, { status: 500 });
  }
}
