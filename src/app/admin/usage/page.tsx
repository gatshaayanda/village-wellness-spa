"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGate from "@/app/admin/admin-gate";
import { auth } from "@/lib/firebase/client";

type UsageDay = {
  date: string; pageViews: number; estimatedSessions: number;
  views_home: number; views_treatments: number; views_treatment_detail: number; views_products: number; views_booking: number; views_account: number; views_other: number;
  source_direct: number; source_search: number; source_social: number; source_referral: number;
  device_mobile: number; device_tablet: number; device_desktop: number;
  bookingStarts: number; availabilityChecks: number; availabilityEmpty: number; availabilityErrors: number;
  bookingSubmissions: number; bookingConflicts: number; enquiries: number;
};
type UsageResponse = { days: number; start: string; end: string; rows: UsageDay[] };

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) + "%" : "—";
}
function sum(rows: UsageDay[], key: keyof UsageDay) {
  return rows.reduce((total, row) => total + (typeof row[key] === "number" ? row[key] as number : 0), 0);
}

function UsagePanel() {
  const [days, setDays] = useState<7 | 30>(30);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in again to view usage insights.");
      const response = await fetch("/api/admin/usage?days=" + days, { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
      const result = await response.json() as UsageResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Usage insights could not be loaded.");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Usage insights could not be loaded.");
    } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const rows = data?.rows ?? [];
  const totals = useMemo(() => ({
    sessions: sum(rows, "estimatedSessions"), views: sum(rows, "pageViews"),
    treatments: sum(rows, "views_treatments") + sum(rows, "views_treatment_detail"),
    bookingViews: sum(rows, "views_booking"), starts: sum(rows, "bookingStarts"),
    checks: sum(rows, "availabilityChecks"), empty: sum(rows, "availabilityEmpty"), errors: sum(rows, "availabilityErrors"),
    submissions: sum(rows, "bookingSubmissions"), conflicts: sum(rows, "bookingConflicts"),
    enquiries: sum(rows, "enquiries"), home: sum(rows, "views_home"), products: sum(rows, "views_products"),
    mobile: sum(rows, "device_mobile"), tablet: sum(rows, "device_tablet"), desktop: sum(rows, "device_desktop"),
    direct: sum(rows, "source_direct"), search: sum(rows, "source_search"), social: sum(rows, "source_social"), referral: sum(rows, "source_referral"),
  }), [rows]);

  const funnel = [
    { label: "Estimated sessions", value: totals.sessions, meaning: "Approximate tab sessions, not verified individual people." },
    { label: "Treatment pages viewed", value: totals.treatments, meaning: "Interest in learning about services; compare this with booking starts." },
    { label: "Booking starts", value: totals.starts, meaning: percent(totals.starts, totals.sessions) + " of estimated sessions entered booking." },
    { label: "Availability checks", value: totals.checks, meaning: percent(totals.empty, totals.checks) + " returned no available slots; " + percent(totals.errors, totals.checks) + " failed to load." },
    { label: "Booking requests submitted", value: totals.submissions, meaning: percent(totals.submissions, totals.starts) + " of tracked booking starts reached successful submission." },
    { label: "Slot conflicts encountered", value: totals.conflicts, meaning: "A conflict indicates a selected time was no longer available at submission." },
  ];

  return <main className="adminPage"><div className="adminShell">
    <header className="adminHeader"><div><span className="kicker">VILLAGE WELLNESS SPA · ADMIN INSIGHTS</span><h1>Understand customer activity.</h1><p>Privacy-conscious funnel and availability signals to help explain what visitors do—not just how many pages they open.</p></div><div className="adminHeaderActions"><Link href="/admin" className="button buttonLight">Back to Admin</Link><button className="button buttonPrimary" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh insights"}</button></div></header>
    <div className="adminTabs"><button className={days===7?"active":""} onClick={()=>setDays(7)}>Last 7 days</button><button className={days===30?"active":""} onClick={()=>setDays(30)}>Last 30 days</button></div>
    {error && <div className="adminToast" role="alert">{error}</div>}
    {loading && <section className="adminPanel"><p>Loading daily summaries…</p></section>}
    {!loading && !error && <>
      <section className="adminStats"><article><span>Estimated sessions</span><strong>{totals.sessions}</strong></article><article><span>Page views</span><strong>{totals.views}</strong></article><article><span>Booking requests</span><strong>{totals.submissions}</strong></article><article><span>Empty availability checks</span><strong>{percent(totals.empty, totals.checks)}</strong></article></section>
      <section className="adminPanel"><div className="panelHeading"><div><h2>Customer journey</h2><p>{data?.start} to {data?.end} · new tracking begins at deployment, so older days may be empty.</p></div></div>
        <div className="calendarList">{funnel.map(item=><article className="calendarItem" key={item.label}><div><strong>{item.label}</strong><span>{item.meaning}</span></div><strong>{item.value}</strong></article>)}</div>
      </section>
      <section className="adminContent twoColumn">
        <div className="adminPanel"><div className="panelHeading"><div><h2>What people explored</h2><p>Page views grouped into useful sections; admin routes are excluded.</p></div></div><div className="calendarList">{[{label:"Home",value:totals.home},{label:"Treatments & details",value:totals.treatments},{label:"Products",value:totals.products},{label:"Booking",value:totals.bookingViews},{label:"Account",value:sum(rows,"views_account")},{label:"Other public pages",value:sum(rows,"views_other")}].map(item=><article className="calendarItem" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</div></div>
        <div className="adminPanel"><div className="panelHeading"><div><h2>Acquisition & devices</h2><p>Coarse categories only; no full referrer URLs or personal identifiers are stored.</p></div></div><div className="calendarList">{[{label:"Direct / unknown",value:totals.direct},{label:"Search",value:totals.search},{label:"Social",value:totals.social},{label:"Other referral",value:totals.referral},{label:"Mobile",value:totals.mobile},{label:"Tablet",value:totals.tablet},{label:"Desktop",value:totals.desktop}].map(item=><article className="calendarItem" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</div></div>
      </section>
      <section className="adminPanel"><div className="panelHeading"><div><h2>Daily trend</h2><p>Use this to see whether growth is reaching treatment discovery, booking intent and successful requests.</p></div></div>{rows.length===0?<p className="slotHint">No usage summaries yet. Public visits after this version is deployed will start populating this view.</p>:<div className="calendarList">{rows.slice().reverse().map(row=><article className="calendarItem" key={row.date}><div><strong>{row.date}</strong><span>{row.pageViews} views · {row.estimatedSessions} estimated sessions · {row.bookingStarts} booking starts · {row.bookingSubmissions} submissions</span></div><small>{row.availabilityEmpty} empty slots · {row.availabilityErrors} availability errors</small></article>)}</div>}</section>
      <section className="adminPanel"><h2>How to read these numbers</h2><p><strong>High treatment views, few booking starts:</strong> check service clarity, published prices, CTA placement and whether customers know they can request an appointment.</p><p><strong>Many booking starts, few submissions:</strong> inspect form friction, validation errors, trust questions and mobile completion.</p><p><strong>Many empty availability checks:</strong> review admin-configured hours, service durations, buffers and actual capacity before changing the interface.</p><p><strong>Many slot conflicts:</strong> investigate competing requests, stale calendar entries or concurrency. Never make a full slot appear available just to improve conversion.</p><p className="slotHint">Metrics are directional, not clinical or financial conclusions. Sessions are approximate; Firebase operational usage is separately visible in the Firebase Console.</p></section>
    </>}
  </div></main>;
}
export default function UsagePage() { return <AdminGate><UsagePanel /></AdminGate>; }
