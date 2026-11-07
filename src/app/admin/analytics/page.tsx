"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/app/admin/admin-gate";
import { auth } from "@/lib/firebase/client";

type Analytics = {
  periodDays: number;
  requests: number;
  walkIns: number;
  appointments: number;
  completedWalkIns: number;
  completedAppointments: number;
  walkInRevenue: number;
  appointmentRevenue: number;
  topRevenueTreatments: Array<{ name: string; transactions: number; revenue: number }>;
  revenueByPaymentMethod: Array<{ method: string; transactions: number; revenue: number }>; 
  distinctCompletedCustomers: number;
  confirmed: number;
  confirmedBookings: number;
  confirmedBookingValue: number;
  confirmedBookingsWithoutExactPrice: number;
  completed: number;
  cancelled: number;
  paidTransactions: number;
  paidRevenue: number;
  averagePaidVisit: number;
  completedWithoutRecordedPayment: number;
  returningCustomers: number;
  firstTimeCustomers: number;
  topTreatments: Array<{ name: string; count: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
};

const money = (value: number) =>
  "P" + Number(value || 0).toLocaleString("en-BW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const user = auth.currentUser;
    if (!user) {
      setError("Your admin session has expired. Sign in again.");
      setLoading(false);
      return () => { active = false; };
    }

    user.getIdToken()
      .then(token => fetch("/api/admin/analytics", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      }))
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Analytics could not be loaded.");
        return result as Analytics;
      })
      .then(result => { if (active) setData(result); })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : "Analytics could not be loaded.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const maxDaily = Math.max(1, ...(data?.dailyRevenue.map(item => item.amount) ?? [0]));
  const value = (amount?: number) => loading ? "—" : money(amount ?? 0);
  const count = (amount?: number) => loading ? "—" : String(amount ?? 0);

  return (
    <main className="adminPage">
      <div className="adminShell">
        <header className="panelHeading">
          <div>
            <span className="kicker">VILLAGE WELLNESS SPA · OWNER VIEW</span>
            <h1>Business performance</h1>
            <p>Thirty-day operating picture from completed visits and recorded payments.</p>
          </div>
          <Link href="/admin" className="button buttonLight">Back to admin</Link>
        </header>

        {error && <p className="bookingError" role="alert">{error}</p>}

        <section className="adminStats">
          <article><span>Recorded revenue · 30 days</span><strong>{value(data?.paidRevenue)}</strong></article>
          <article><span>Completed visits</span><strong>{count(data?.completed)}</strong></article>
          <article><span>Average paid visit</span><strong>{value(data?.averagePaidVisit)}</strong></article>
          <article><span>Returning customers</span><strong>{count(data?.returningCustomers)}</strong></article>
          <article><span>Distinct customers completed</span><strong>{count(data?.distinctCompletedCustomers)}</strong></article>
        </section>

        <section className="adminContent twoColumn">
          <div className="adminPanel">
            <div className="panelHeading">
              <div><span className="kicker">FINANCIAL RECONCILIATION · BWP</span><h2>Money actually recorded</h2></div>
            </div>
            <div className="adminStats">
              <article><span>Paid transactions</span><strong>{count(data?.paidTransactions)}</strong></article>
              <article><span>Completed without amount recorded</span><strong>{count(data?.completedWithoutRecordedPayment)}</strong></article>
              <article><span>Walk-in collections</span><strong>{value(data?.walkInRevenue)}</strong></article>
              <article><span>Appointment collections</span><strong>{value(data?.appointmentRevenue)}</strong></article>
              <article><span>Confirmed appointments · 30 days</span><strong>{count(data?.confirmedBookings)}</strong></article>
              <article><span>Confirmed booking value · exact prices only</span><strong>{value(data?.confirmedBookingValue)}</strong></article>
              <article><span>Confirmed bookings without exact catalogue price</span><strong>{count(data?.confirmedBookingsWithoutExactPrice)}</strong></article>
            </div>
            <p className="orderTruth">Revenue includes only completed visits with an explicit PAID status and an actual final amount. Catalogue prices and unverified amounts are not counted as money received.</p>
          </div>

          <div className="adminPanel">
            <div className="panelHeading">
              <div><span className="kicker">OPERATIONS · LAST 30 DAYS</span><h2>Where things stand</h2></div>
            </div>
            <div className="adminStats">
              <article><span>Bookings & visits</span><strong>{count(data?.requests)}</strong></article>
              <article><span>Walk-ins</span><strong>{count(data?.walkIns)}</strong><small>{loading ? " " : (data?.completedWalkIns ?? 0) + " completed"}</small></article>
              <article><span>Appointments</span><strong>{count(data?.appointments)}</strong><small>{loading ? " " : (data?.completedAppointments ?? 0) + " completed"}</small></article>
              <article><span>Cancelled / declined / missed</span><strong>{count(data?.cancelled)}</strong></article>
            </div>
          </div>
        </section>

        <section className="adminPanel">
          <div className="panelHeading"><div><span className="kicker">PAYMENT MIX · LAST 30 DAYS</span><h2>Collections by payment method</h2></div></div>
          {loading ? <p>Loading payment records…</p> : data?.revenueByPaymentMethod.length ? <div className="queue">{data.revenueByPaymentMethod.map(item => <article className="requestRow" key={item.method}><div><strong>{item.method}</strong><span>{item.transactions} paid transaction{item.transactions === 1 ? "" : "s"}</span></div><strong>{money(item.revenue)}</strong></article>)}</div> : <p className="emptyState">No payment methods have been recorded yet.</p>}
        </section>

        <section className="adminPanel">
          <div className="panelHeading">
            <div><span className="kicker">COLLECTION TREND · LAST 7 DAYS</span><h2>Daily recorded revenue</h2></div>
          </div>
          {loading ? <p>Loading saved transactions…</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 12, alignItems: "end", minHeight: 190 }}>
              {(data?.dailyRevenue ?? []).map(item => (
                <div key={item.date} style={{ display: "grid", gap: 8, alignItems: "end", textAlign: "center", minWidth: 0 }}>
                  <strong style={{ fontSize: ".75rem", overflowWrap: "anywhere" }}>{item.amount ? money(item.amount) : "—"}</strong>
                  <div aria-label={money(item.amount)} style={{ height: 120, display: "flex", alignItems: "end", background: "var(--surface-muted, #f3f0ec)", borderRadius: 8, overflow: "hidden" }}>
                    <span style={{ display: "block", width: "100%", height: Math.max(3, item.amount / maxDaily * 100) + "%", background: "var(--accent, #20b273)", borderRadius: 8 }} />
                  </div>
                  <small>{new Date(item.date + "T12:00:00+02:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Africa/Gaborone" })}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="adminContent twoColumn">
          <div className="adminPanel">
            <div className="panelHeading"><div><span className="kicker">RECORDED COLLECTIONS · LAST 30 DAYS</span><h2>Revenue by treatment</h2></div></div>
            {loading ? <p>Loading treatment collections…</p> : data?.topRevenueTreatments.length ? (
              <div className="queue">
                {data.topRevenueTreatments.map(item => <article className="requestRow" key={item.name}><div><strong>{item.name}</strong><span>{item.transactions} paid visit{item.transactions === 1 ? "" : "s"}</span></div><strong>{money(item.revenue)}</strong></article>)}
              </div>
            ) : <p className="emptyState">No completed treatment amounts have been recorded in this period.</p>}
          </div>
          <div className="adminPanel">
            <div className="panelHeading"><div><span className="kicker">CUSTOMER MIX · LAST 30 DAYS</span><h2>First visit & return</h2></div></div>
            <div className="adminStats">
              <article><span>First completed visit</span><strong>{count(data?.firstTimeCustomers)}</strong></article>
              <article><span>Returning customers</span><strong>{count(data?.returningCustomers)}</strong></article>
            </div>
            <p className="orderTruth">Counts use completed visits in this period, grouped by linked account or saved phone number. They are not unique website visitors.</p>
          </div>
        </section>

        <section className="adminPanel">
          <div className="panelHeading">
            <div><span className="kicker">CUSTOMER DEMAND · LAST 30 DAYS</span><h2>Most booked treatments</h2></div>
          </div>
          {loading ? <p>Loading treatment demand…</p> : data?.topTreatments.length ? (
            <div className="queue">
              {data.topTreatments.map((item, index) => (
                <article className="requestRow" key={item.name}>
                  <div><strong>{index + 1}. {item.name}</strong><span>{item.count} booking{item.count === 1 ? "" : "s"}</span></div>
                </article>
              ))}
            </div>
          ) : <p className="emptyState">No treatment demand recorded in this period yet.</p>}
        </section>


        <p className="orderTruth">Figures use Africa/Gaborone business dates. Returning customers are grouped by linked customer account, or saved phone number where no account is linked. This is a management view, not an accounting ledger; reconcile recorded totals against actual cash, mobile-money and card records.</p>
      </div>
    </main>
  );
}

export default function AdminAnalyticsPage() {
  return <AdminGate><AnalyticsDashboard /></AdminGate>;
}
