import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Sign in with an authorized staff account." }, { status: 401 });
  const requested = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const days = requested === 7 ? 7 : 30;
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const startDate = new Date(today + "T12:00:00Z");
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  const start = startDate.toISOString().slice(0, 10);
  try {
    const snapshot = await getAdminDb().collection("usageDaily")
      .where("date", ">=", start)
      .where("date", "<=", today)
      .orderBy("date", "asc")
      .get();
    const rows = snapshot.docs.map((item) => {
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
      };
    });
    return NextResponse.json({ days, start, end: today, rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] usage summary unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Usage insights could not be loaded." }, { status: 500 });
  }
}
