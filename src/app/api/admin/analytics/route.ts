import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
type BookingRecord = Record<string, unknown>;
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
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BookingRecord[];
    const recent = records.filter(item => {
      const created = Date.parse(String(item.createdAt ?? ""));
      return Number.isFinite(created) && created >= cutoff && item.requestType !== "WAITLIST";
    });
    const completed = records.filter(item => item.status === "COMPLETED" && item.requestType !== "WAITLIST" && Date.parse(dateKey(item.completedAt ?? item.statusUpdatedAt ?? item.createdAt) + "T12:00:00+02:00") >= cutoff);
    const paid = completed.filter(item => item.paymentStatus === "PAID" && amountOf(item.finalPriceSnapshot) !== null);
    const paidRevenue = paid.reduce((sum, item) => sum + (amountOf(item.finalPriceSnapshot) ?? 0), 0);
    const walkIns = recent.filter(item => item.requestType === "QUEUE");
    const appointments = recent.filter(item => item.requestType !== "QUEUE" && (!item.requestType || item.requestType === "APPOINTMENT"));
    const paidWalkIns = paid.filter(item => item.requestType === "QUEUE");
    const paidAppointments = paid.filter(item => item.requestType !== "QUEUE" && (!item.requestType || item.requestType === "APPOINTMENT"));
    const sumPaid = (items: BookingRecord[]) => items.reduce((sum, item) => sum + (amountOf(item.finalPriceSnapshot) ?? 0), 0);
    const treatmentTotals = new Map<string, { transactions: number; revenue: number }>();
    const paymentTotals = new Map<string, { transactions: number; revenue: number }>();
    paid.forEach(item => {
      const name = String(item.serviceNameSnapshot ?? "Unspecified treatment");
      const current = treatmentTotals.get(name) ?? { transactions: 0, revenue: 0 };
      current.transactions += 1;
      current.revenue += amountOf(item.finalPriceSnapshot) ?? 0;
      treatmentTotals.set(name, current);
      const method = String(item.paymentMethod ?? "NOT_RECORDED").replace(/_/g, " ");
      const payment = paymentTotals.get(method) ?? { transactions: 0, revenue: 0 };
      payment.transactions += 1;
      payment.revenue += amountOf(item.finalPriceSnapshot) ?? 0;
      paymentTotals.set(method, payment);
    });
    const demand = new Map<string, number>();
    recent.filter(item => !["CANCELLED", "DECLINED", "NO_SHOW"].includes(String(item.status))).forEach(item => {
      const name = String(item.serviceNameSnapshot ?? "Unspecified treatment");
      demand.set(name, (demand.get(name) ?? 0) + 1);
    });
    const customerVisits = new Map<string, number>();
    records.filter(item => item.status === "COMPLETED").forEach(item => {
      const identity = String(item.customerUid ?? item.phone ?? "").trim();
      if (identity) customerVisits.set(identity, (customerVisits.get(identity) ?? 0) + 1);
    });
    const recentCustomerIds = new Set(completed.map(item => String(item.customerUid ?? item.phone ?? "").trim()).filter(Boolean));
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
      completedAppointments: completed.filter(item => item.requestType !== "QUEUE" && (!item.requestType || item.requestType === "APPOINTMENT")).length,
      confirmed: recent.filter(item => ["CONFIRMED", "ARRIVED", "COMPLETED"].includes(String(item.status))).length,
      completed: completed.length,
      cancelled: recent.filter(item => ["CANCELLED", "DECLINED", "NO_SHOW"].includes(String(item.status))).length,
      paidTransactions: paid.length,
      paidRevenue: Number(paidRevenue.toFixed(2)),
      walkInRevenue: Number(sumPaid(paidWalkIns).toFixed(2)),
      appointmentRevenue: Number(sumPaid(paidAppointments).toFixed(2)),
      topRevenueTreatments: Array.from(treatmentTotals.entries()).map(([name, values]) => ({ name, transactions: values.transactions, revenue: Number(values.revenue.toFixed(2)) })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      revenueByPaymentMethod: Array.from(paymentTotals.entries()).map(([method, values]) => ({ method, transactions: values.transactions, revenue: Number(values.revenue.toFixed(2)) })).sort((a, b) => b.revenue - a.revenue),
      averagePaidVisit: paid.length ? Number((paidRevenue / paid.length).toFixed(2)) : 0,
      completedWithoutRecordedPayment: completed.filter(item => item.paymentStatus !== "PAID" || amountOf(item.finalPriceSnapshot) === null).length,
      distinctCompletedCustomers: recentCustomerIds.size,
      returningCustomers: Array.from(recentCustomerIds).filter(identity => (customerVisits.get(identity) ?? 0) > 1).length,
      firstTimeCustomers: Array.from(recentCustomerIds).filter(identity => (customerVisits.get(identity) ?? 0) === 1).length,
      topTreatments: Array.from(demand.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6),
      dailyRevenue,
      source: "bookingRequests",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] analytics unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Business analytics could not be loaded." }, { status: 503 });
  }
}
