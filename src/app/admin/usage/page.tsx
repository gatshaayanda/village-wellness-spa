"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGate from "@/app/admin/admin-gate";
import { auth } from "@/lib/firebase/client";
import { getLocalUsageEvents, type LocalUsageEvent } from "@/lib/tripple-s/usage";

type UsageDay = {
  date: string;
  pageViews: number;
  estimatedSessions: number;
  views_home: number;
  views_treatments: number;
  views_treatment_detail: number;
  views_products: number;
  views_booking: number;
  views_queue: number;
  views_account: number;
  views_other: number;
  source_direct: number;
  source_search: number;
  source_social: number;
  source_referral: number;
  device_mobile: number;
  device_tablet: number;
  device_desktop: number;
  bookingStarts: number;
  availabilityChecks: number;
  availabilityEmpty: number;
  availabilityErrors: number;
  bookingSubmissions: number;
  bookingConflicts: number;
  enquiries: number;
  walkInQueueStarts: number;
  walkInsJoined: number;
  walkInsRegistered: number;
  treatmentSelections: number;
  visitsCompleted: number;
  eventCount: number;
  payloadBytes: number;
  firebaseWrites: number;
};
type RecentEvent = { id: string; event: string; category: string; outcome?: string; createdAt: string; payloadBytes: number };
type UsageResponse = { days: number; start: string; end: string; rows: UsageDay[]; recentEvents: RecentEvent[]; referenceCeilingBytes: number };

const REFERENCE_CEILING_BYTES = 25_000_000_000;
const sum = (rows: UsageDay[], key: keyof UsageDay) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
const formatBytes = (value: number) => value < 1024 ? value + " B" : value < 1024 ** 2 ? (value / 1024).toFixed(1) + " KB" : value < 1024 ** 3 ? (value / 1024 ** 2).toFixed(2) + " MB" : (value / 1024 ** 3).toFixed(3) + " GB";
const eventLabel: Record<string, string> = {
  page_view: "Public page viewed",
  booking_start: "Appointment flow opened",
  availability_result: "Availability checked",
  booking_submit_success: "Appointment request submitted",
  booking_conflict: "Appointment slot conflict",
  enquiry_submit_success: "Enquiry submitted",
  walkin_registered: "Walk-in registered by reception",
  visit_completed: "Visit completed",
  walkin_queue_start: "Walk-in queue opened",
  walkin_queue_join_success: "Customer joined the walk-in queue",
  treatment_selected: "Treatment selected",
};

function UsagePanel() {
  const [days, setDays] = useState<7 | 30>(30);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [localEvents, setLocalEvents] = useState<LocalUsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in again to view usage insights.");
      const response = await fetch("/api/admin/usage?days=" + days, {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const result = await response.json() as UsageResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Usage insights could not be loaded.");
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Usage insights could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    setLocalEvents(getLocalUsageEvents(30));
    void load();
  }, [load]);

  const rows = data?.rows ?? [];
  const totals = useMemo(() => ({
    sessions: sum(rows, "estimatedSessions"),
    views: sum(rows, "pageViews"),
    treatmentViews: sum(rows, "views_treatments") + sum(rows, "views_treatment_detail"),
    queueStarts: sum(rows, "walkInQueueStarts"),
    queueJoins: sum(rows, "walkInsJoined"),
    bookingStarts: sum(rows, "bookingStarts"),
    bookings: sum(rows, "bookingSubmissions"),
    treatmentSelections: sum(rows, "treatmentSelections"),
    eventCount: sum(rows, "eventCount"),
    payloadBytes: sum(rows, "payloadBytes"),
    firebaseWrites: sum(rows, "firebaseWrites"),
  }), [rows]);

  const localTotals = useMemo(() => ({
    views: localEvents.filter(item => item.event === "page_view").length,
    queueStarts: localEvents.filter(item => item.event === "walkin_queue_start").length,
    queueJoins: localEvents.filter(item => item.event === "walkin_queue_join_success").length,
    bookings: localEvents.filter(item => item.event === "booking_submit_success").length,
    bytes: localEvents.reduce((total, item) => total + item.payloadBytes, 0),
  }), [localEvents]);

  const percent = Math.min(100, totals.payloadBytes / REFERENCE_CEILING_BYTES * 100);
  const recent = data?.recentEvents ?? [];

  return (
    <main className="adminPage">
      <div className="adminShell">
        <header className="adminHeader">
          <div><span className="kicker">VILLAGE WELLNESS SPA · OWNER INSIGHTS</span><h1>See the work happening.</h1><p>Privacy-limited signals show how the app is welcoming visitors, helping them explore treatments and carrying requests through to the spa.</p></div>
          <div className="adminHeaderActions"><Link href="/admin" className="button buttonLight">Back to Admin</Link><button className="button buttonPrimary" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh activity"}</button></div>
        </header>

        <div className="adminTabs"><button className={days === 7 ? "active" : ""} onClick={() => setDays(7)}>Last 7 days</button><button className={days === 30 ? "active" : ""} onClick={() => setDays(30)}>Last 30 days</button></div>
        {error && <div className="adminToast" role="alert">{error}</div>}
        {loading && <section className="adminPanel"><p>Loading saved activity…</p></section>}

        {!loading && data && (
          <>
            <section className="adminStats">
              <article><span>Estimated sessions</span><strong>{totals.sessions}</strong></article>
              <article><span>Public page views</span><strong>{totals.views}</strong></article>
              <article><span>Walk-ins joined</span><strong>{totals.queueJoins}</strong></article>
              <article><span>Appointment requests</span><strong>{totals.bookings}</strong></article>
            </section>

            <section className="adminPanel villageUsageMeterPanel">
              <div className="panelHeading"><div><span className="kicker">FIREBASE · TRACKED EVENT PAYLOAD</span><h2>What the app is recording</h2><p>Estimated payload footprint from privacy-limited journey events recorded by this app.</p></div><strong>{formatBytes(totals.payloadBytes)} <small>/ BoardSignal 25 GB</small></strong></div>
              <div className="villageUsageTrack" role="img" aria-label={percent.toFixed(7) + " percent of the 25 gigabyte reference ceiling used by tracked event payloads"}><span style={{ width: percent + "%" }} /></div>
              <div className="villageUsageMeterMeta"><strong>{percent.toFixed(7)}% of the BoardSignal 25 GB reference ceiling</strong><span>{totals.eventCount} events · approximately {totals.firebaseWrites} Firestore writes from analytics</span></div>
              <p className="slotHint">This is the server-measured JSON payload size of tracked analytics events, not total Firebase project storage, billing, Firestore reads, bandwidth, indexes or media. The BoardSignal 25 GB figure is a reference ceiling; Firebase Console remains authoritative for project-wide usage.</p>
            </section>

            <section className="adminContent twoColumn">
              <div className="adminPanel"><div className="panelHeading"><div><span className="kicker">CUSTOMER JOURNEY</span><h2>What visitors are doing</h2></div></div>
                <div className="calendarList">
                  <article className="calendarItem"><div><strong>Treatment pages explored</strong><span>People learning about the spa’s services</span></div><strong>{totals.treatmentViews}</strong></article>
                  <article className="calendarItem"><div><strong>Treatments selected</strong><span>Interest expressed in a specific treatment</span></div><strong>{totals.treatmentSelections}</strong></article>
                  <article className="calendarItem"><div><strong>Walk-in queue opened</strong><span>Visitors entering the same-day queue flow</span></div><strong>{totals.queueStarts}</strong></article>
                  <article className="calendarItem"><div><strong>Walk-ins joined</strong><span>Queue entries successfully saved by the server</span></div><strong>{totals.queueJoins}</strong></article>
                  <article className="calendarItem"><div><strong>Appointment starts / submissions</strong><span>{totals.bookingStarts} starts · {totals.bookings} submitted</span></div><strong>{totals.bookings}</strong></article>
                </div>
              </div>
              <div className="adminPanel"><div className="panelHeading"><div><span className="kicker">LOCAL THIS DEVICE</span><h2>Browser activity copy</h2></div></div>
                <div className="adminStats villageLocalUsageStats">
                  <article><span>Page views</span><strong>{localTotals.views}</strong></article>
                  <article><span>Queue joins</span><strong>{localTotals.queueJoins}</strong></article>
                  <article><span>Queue opens</span><strong>{localTotals.queueStarts}</strong></article>
                  <article><span>Local event payload</span><strong>{formatBytes(localTotals.bytes)}</strong></article>
                </div>
                <p className="slotHint">This copy is stored only in this browser and is not synced. It is useful during local/demo iterations, but it is not Firebase usage and is not added to the 25 GB meter.</p>
              </div>
            </section>

            <section className="adminPanel"><div className="panelHeading"><div><span className="kicker">LATEST SIGNALS · MAX 100</span><h2>Recent app activity</h2></div><small>{recent.length} server events</small></div>
              {recent.length ? <div className="calendarList">{recent.slice(0, 20).map(item => <article className="calendarItem" key={item.id}><div><strong>{eventLabel[item.event] || item.event}</strong><span>{item.category.replaceAll("_", " ")} · {item.createdAt ? new Date(item.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Gaborone", dateStyle: "medium", timeStyle: "short" }) : "Time unavailable"}</span></div><small>{formatBytes(item.payloadBytes)}</small></article>)}</div> : <p className="slotHint">No Firebase activity events have been recorded yet. Once this version is live and Firebase is configured, public visits will begin appearing here.</p>}
            </section>
          </>
        )}
        {!loading && !data && <section className="adminPanel"><h2>Firebase activity is unavailable</h2><p>The local browser copy is still available below. Server-side event writes require the Village Firebase Admin configuration.</p><p className="slotHint">This browser: {localTotals.views} page views · {localTotals.queueJoins} queue joins · {formatBytes(localTotals.bytes)} local event payload.</p></section>}
      </div>
    </main>
  );
}

export default function UsagePage() {
  return <AdminGate><UsagePanel /></AdminGate>;
}
