import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const amountOf = (value: unknown) => {
  const match = String(value ?? "").replace(/,/g, "").match(/^P?\s*(\d+(?:\.\d{1,2})?)$/i);
  return match ? Number(match[1]) : null;
};
const dateKey = (value: unknown) => {
  const parsed = new Date(String(value ?? ""));
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed)
    : "";
};
export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Sign in with an authorized staff account." }, { status: 401 });
  try {
    const snapshot = await getAdminDb().collection("bookingRequests").get();
    const now = Date.now(), cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<Record<string, any>>;
    const recent = records.filter(item => {
      const created = Date.parse(String(item.createdAt ?? ""));
      return Number.isFinite(created) && created >= cutoff && item.requestType !== "WAITLIST";
    });
    const completed = recent.filter(item => item.status === "COMPLETED");
    const paid = completed.filter(item => item.paymentStatus === "PAID" && amountOf(item.finalPriceSnapshot) !== null);
    const paidRevenue = paid.reduce((sum, item) => sum + (amountOf(item.finalPriceSnapshot) ?? 0), 0);
    const walkIns = recent.filter(item => item.requestType === "QUEUE");
    const appointments = recent.filter(item => item.requestType !== "QUEUE");
    const paidWalkIns = paid.filter(item => item.requestType === "QUEUE");
    const paidAppointments = paid.filter(item => item.requestType !== "QUEUE");
    const sumPaid = (items: Array<Record<string, any>>) => items.reduce((sum, item) => sum + (amountOf(item.finalPriceSnapshot) ?? 0), 0);
    const demand = new Map<string, number>();
    recent.filter(item => !["CANCELLED", "DECLINED", "NO_SHOW"].includes(String(item.status))).forEach(item => {
      const name = String(item.serviceNameSnapshot ?? "Unspecified treatment");
      demand.set(name, (demand.get(name) ?? 0) + 1);
    });
    const customerVisits = new Map<string, number>();
    completed.forEach(item => {
      const identity = String(item.customerUid ?? item.phone ?? "").trim();
      if (identity) customerVisits.set(identity, (customerVisits.get(identity) ?? 0) + 1);
    });
    const daily = new Map<string, number>();
    paid.forEach(item => {
      const key = dateKey(item.completedAt ?? item.statusUpdatedAt ?? item.createdAt);
      if (key) daily.set(key, (daily.get(key) ?? 0) + (amountOf(item.finalPriceSnapshot) ?? 0));
    });
    const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now - (6 - index) * 86400000);
      const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
      return { date: key, amount: daily.get(key) ?? 0 };
    });
    return NextResponse.json({
      periodDays: 30,
      requests: recent.length,
      walkIns: walkIns.length,
      appointments: appointments.length,
      completedWalkIns: completed.filter(item => item.requestType === "QUEUE").length,
      completedAppointments: completed.filter(item => item.requestType !== "QUEUE").length,
      confirmed: recent.filter(item => ["CONFIRMED", "ARRIVED", "COMPLETED"].includes(String(item.status))).length,
      completed: completed.length,
      cancelled: recent.filter(item => ["CANCELLED", "DECLINED", "NO_SHOW"].includes(String(item.status))).length,
      paidTransactions: paid.length,
      paidRevenue: Number(paidRevenue.toFixed(2)),
      walkInRevenue: Number(sumPaid(paidWalkIns).toFixed(2)),
      appointmentRevenue: Number(sumPaid(paidAppointments).toFixed(2)),
      averagePaidVisit: paid.length ? Number((paidRevenue / paid.length).toFixed(2)) : 0,
      completedWithoutRecordedPayment: completed.filter(item => item.paymentStatus !== "PAID" || amountOf(item.finalPriceSnapshot) === null).length,
      distinctCompletedCustomers: customerVisits.size,
      returningCustomers: Array.from(customerVisits.values()).filter(count => count > 1).length,
      topTreatments: Array.from(demand.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6),
      dailyRevenue,
      source: "bookingRequests",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] analytics unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Business analytics could not be loaded." }, { status: 503 });
  }
}
