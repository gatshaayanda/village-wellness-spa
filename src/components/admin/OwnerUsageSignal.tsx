"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { getLocalUsageEvents } from "@/lib/tripple-s/usage";

const REFERENCE_BYTES = 25_000_000_000;
type Signal = { pageViews: number; queueJoins: number; bookingSubmissions: number; eventCount: number; payloadBytes: number; firebaseWrites: number };
const emptySignal: Signal = { pageViews: 0, queueJoins: 0, bookingSubmissions: 0, eventCount: 0, payloadBytes: 0, firebaseWrites: 0 };
const bytes = (value: number) => value < 1024 ? value + " B" : value < 1024 ** 2 ? (value / 1024).toFixed(1) + " KB" : value < 1024 ** 3 ? (value / 1024 ** 2).toFixed(2) + " MB" : (value / 1024 ** 3).toFixed(3) + " GB";

export default function OwnerUsageSignal() {
  const [signal, setSignal] = useState<Signal>(emptySignal);
  const [localViews, setLocalViews] = useState(0);
  const [localQueueJoins, setLocalQueueJoins] = useState(0);
  const [localPayloadBytes, setLocalPayloadBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Admin session unavailable.");
      const response = await fetch("/api/admin/usage?days=7", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const result = await response.json() as { rows?: Array<Record<string, unknown>>; error?: string };
      if (!response.ok) throw new Error(result.error || "App activity could not be loaded.");
      const rows = result.rows || [];
      const total = (key: string) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
      setSignal({
        pageViews: total("pageViews"),
        queueJoins: total("walkInsJoined"),
        bookingSubmissions: total("bookingSubmissions"),
        eventCount: total("eventCount"),
        payloadBytes: total("payloadBytes"),
        firebaseWrites: total("firebaseWrites"),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "App activity could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const local = getLocalUsageEvents(7);
    setLocalViews(local.filter(item => item.event === "page_view").length);
    setLocalQueueJoins(local.filter(item => item.event === "walkin_queue_join_success").length);
    setLocalPayloadBytes(local.reduce((sum, item) => sum + item.payloadBytes, 0));
    void load();
  }, [load]);

  const percent = Math.min(100, signal.payloadBytes / REFERENCE_BYTES * 100);

  return (
    <section className="adminPanel villageOwnerSignal" aria-label="App activity and Firebase telemetry">
      <div className="panelHeading">
        <div><span className="kicker">APP ACTIVITY · FIREBASE TELEMETRY</span><h2>What the app is doing</h2><p>Visitor interest and completed customer actions, not just a website visit counter.</p></div>
        <button type="button" className="button buttonLight" onClick={() => void load()} disabled={loading}>{loading ? "Checking…" : "Refresh"}</button>
      </div>
      <div className="villageOwnerSignalGrid">
        <article><span>Public page views · 7 days</span><strong>{loading || error ? "—" : signal.pageViews}</strong></article>
        <article><span>Walk-ins joined · 7 days</span><strong>{loading || error ? "—" : signal.queueJoins}</strong></article>
        <article><span>Appointments submitted · 7 days</span><strong>{loading || error ? "—" : signal.bookingSubmissions}</strong></article>
        <article><span>Analytics events saved</span><strong>{loading || error ? "—" : signal.eventCount}</strong></article>
      </div>
      <div className="villageOwnerSignalMeter">
        <div><strong>Tracked Firebase event payload</strong><b>{loading ? "Checking…" : error ? "Unavailable" : bytes(signal.payloadBytes)} <span>/ BoardSignal 25 GB reference ceiling</span></b></div>
        <div className="villageUsageTrack" role="img" aria-label={error ? "Firebase telemetry unavailable" : percent.toFixed(7) + " percent of the reference ceiling"}><span style={{ width: (error ? 0 : percent) + "%" }} /></div>
        <small>{loading ? "Checking saved telemetry…" : error ? "Firebase telemetry is unavailable; local browser activity is shown separately below." : percent.toFixed(7) + "% of the reference ceiling · " + signal.firebaseWrites + " analytics document writes"}</small>
      </div>
      {error && <p className="slotHint" role="status">{error}</p>}
      <p className="slotHint">The 25 GB meter measures the JSON payload footprint of this app’s tracked events only. It is not total Firebase storage, reads, bandwidth, billing, media or indexes. Firebase Console is authoritative for project-wide usage. Browser-local activity stays separate: {localViews} page views, {localQueueJoins} queue joins and {bytes(localPayloadBytes)} of event payload on this device in the last seven days. This copy is not synced or added to Firebase.</p>
    </section>
  );
}
