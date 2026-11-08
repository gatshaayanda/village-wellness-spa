"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/app/admin/admin-gate";
import { auth } from "@/lib/firebase/client";
import { getPublicServices, type ServiceRecord } from "@/lib/firebase/data";
import { trackUsage } from "@/lib/tripple-s/usage";

type Item = {
  id: string;
  name?: string;
  phone?: string;
  serviceNameSnapshot?: string;
  status: string;
  createdAt: string;
  finalPriceSnapshot?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  recommendedReturnDate?: string;
  returnNote?: string;
  requestType?: string;
};

function QueueDashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const [finalPrices, setFinalPrices] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const token = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in again.");
    return user.getIdToken();
  };

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/queue", {
      headers: { Authorization: "Bearer " + await token() },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Today's visits could not be loaded.");
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    let active = true;
    void load().catch(error => { if (active) setNotice(error.message); })
      .finally(() => { if (active) setLoading(false); });
    void getPublicServices().then(value => { if (active) setServices(value.filter(item => item.active)); })
      .catch(() => { if (active) setNotice("Treatments could not be loaded. Check the treatment catalogue in Admin."); });
    return () => { active = false; };
  }, [load]);

  async function update(id: string, status: "ARRIVED" | "COMPLETED") {
    setBusy(id);
    setNotice("");
    try {
      const response = await fetch("/api/admin/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() },
        body: JSON.stringify({ id, status, finalPrice: finalPrices[id] || "", paymentMethod: paymentMethods[id] || "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Visit update failed.");
      if (status === "COMPLETED") trackUsage("visit_completed");
      await load();
      setNotice(status === "COMPLETED"
        ? "Visit completed. The customer's account history has been updated."
        : "Customer marked as arrived.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Visit update failed.");
    } finally {
      setBusy("");
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy("new");
    setNotice("");
    setShareLink("");
    try {
      const response = await fetch("/api/admin/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() },
        body: JSON.stringify({ action: "create", name, phone, serviceName: service }),
      });
      const data = await response.json() as { claimToken?: string; linkedToExistingAccount?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Walk-in could not be registered.");
      if (data.claimToken) {
        const link = window.location.origin + "/account?claim=" + encodeURIComponent(data.claimToken);
        const digits = phone.replace(/\D/g, "");
        const normalized = digits.startsWith("267") ? digits : digits.startsWith("0") ? "267" + digits.slice(1) : digits.length === 8 ? "267" + digits : digits;
        setShareLink("https://wa.me/" + normalized + "?text=" + encodeURIComponent(
          "Welcome to Village Wellness Spa. Your visit is saved. Open your private customer account to keep your visit history, receive spa updates and book again: " + link
        ));
        setSharePhone(phone);
      }
      trackUsage("walkin_registered");
      setName("");
      setPhone("");
      setService("");
      await load();
      setNotice(data.linkedToExistingAccount
        ? "Walk-in registered as arrived and linked to the customer's existing account."
        : "Walk-in registered as arrived. The customer's optional account link is ready to share.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Walk-in could not be registered.");
    } finally {
      setBusy("");
    }
  }

  const active = items.filter(item => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status));
  const completed = items.filter(item => item.status === "COMPLETED");
  const walkIns = items.filter(item => item.requestType === "QUEUE");
  const appointments = items.filter(item => item.requestType !== "QUEUE");

  return (
    <main className="adminPage">
      <div className="adminShell">
        <header className="panelHeading">
          <div>
            <span className="kicker">ON-SITE TEAM · RECEPTION</span>
            <h1>Walk-ins &amp; visits</h1>
            <p>Two steps only: <strong>ARRIVED → COMPLETED</strong>. Register the customer when they arrive; complete the visit when treatment is finished and payment is received.</p>
          </div>
          <div className="actions"><Link href="/admin/analytics" className="button buttonLight">Owner analytics</Link><Link href="/admin" className="button buttonLight">Main admin</Link></div>
        </header>

        <section className="adminStats" aria-label="Today's reception summary">
          <article><span>At the spa now</span><strong>{loading ? "—" : active.length}</strong></article>
          <article><span>Completed today</span><strong>{loading ? "—" : completed.length}</strong></article>
          <article><span>Walk-ins today</span><strong>{loading ? "—" : walkIns.length}</strong><small>{appointments.length} appointment{appointments.length === 1 ? "" : "s"} in today’s list</small></article>
        </section>

        <section className="adminPanel">
          <h2>Register a walk-in</h2>
          <p>Staff handles reception; the customer fills in nothing. A saved mobile number reconnects a returning customer to their account. For a first visit, staff records the customer’s name once.</p>
          <form className="adminForm" onSubmit={add}>
            <div className="formGrid">
              <label>Customer name <span>(first visit only)</span><input value={name} onChange={event => setName(event.target.value)} maxLength={120} placeholder="Name for a new customer" /><small>Returning customer? Leave blank if their mobile number matches one saved account. A new customer’s name is saved with this visit.</small></label>
              <label>WhatsApp number<input value={phone} onChange={event => setPhone(event.target.value)} required maxLength={40} placeholder="+267 …" /></label>
              <label className="fieldFull">Treatment<select value={service} onChange={event => setService(event.target.value)} required><option value="">Choose treatment</option>{services.map(item => <option key={item.id} value={item.name}>{item.name} · {item.price}</option>)}</select></label>
            </div>
            <button className="button buttonPrimary" type="submit" disabled={busy === "new"}>{busy === "new" ? "Saving arrival…" : "Register arrival ↗"}</button>
          </form>
          {shareLink && (
            <div className="customerPanel" role="status">
              <strong>Customer account link ready</strong>
              <p>Send this optional link to {sharePhone}. The customer can open their account, keep visit history and book again. They do not need to complete a form at reception.</p>
              <a className="button buttonPrimary" href={shareLink} target="_blank" rel="noreferrer">Prepare WhatsApp welcome ↗</a>
            </div>
          )}
        </section>

        {notice && <p role="status" className="slotHint">{notice}</p>}

        <section className="adminPanel">
          <div className="panelHeading">
            <div><h2>At the spa <span>{active.length}</span></h2><p>When the treatment is finished, mark the visit completed. No intermediate queue statuses.</p></div>
            <button className="button buttonLight" type="button" onClick={() => void load().catch(error => setNotice(error.message))}>Refresh</button>
          </div>
          {loading ? <p className="slotHint">Loading today&apos;s visits…</p> : active.length === 0 ? <p className="emptyState">No visits currently at the spa.</p> : active.map(item => (
            <article className="requestRow" key={item.id}>
              <div>
                <strong>{item.name || "Customer"} · {item.serviceNameSnapshot || "Visit"}</strong>
                <span>{item.phone || "No phone saved"} · {item.status === "CONFIRMED" ? "Appointment due" : "Arrived"} · {new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Gaborone" })}</span>
              </div>
              <div className="actions">
                {item.status === "CONFIRMED" ? (
                  <button className="button buttonLight" disabled={!!busy} onClick={() => void update(item.id, "ARRIVED")}>Arrived</button>
                ) : (
                  <div className="field">
                    <label>Amount received (BWP)<input inputMode="decimal" required value={finalPrices[item.id] || ""} onChange={event => setFinalPrices(values => ({ ...values, [item.id]: event.target.value }))} placeholder="Actual amount paid" /></label><label>Payment method<select required value={paymentMethods[item.id] || ""} onChange={event => setPaymentMethods(values => ({ ...values, [item.id]: event.target.value }))}><option value="">Choose payment method</option><option value="CASH">Cash</option><option value="ORANGE_MONEY">Orange Money</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
                                        <button className="button buttonPrimary" disabled={!!busy || !finalPrices[item.id]?.trim() || !paymentMethods[item.id]} onClick={() => void update(item.id, "COMPLETED")}>{busy === item.id ? "Saving…" : "Complete · payment received"}</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="adminPanel">
          <h2>Completed today <span>{completed.length}</span></h2>
          {completed.length ? completed.map(item => (
            <article className="requestRow" key={item.id}>
              <div>
                <strong>{item.name || "Customer"} · {item.serviceNameSnapshot || "Visit"}</strong>
                <span>{item.finalPriceSnapshot ? item.finalPriceSnapshot + " received · " + (item.paymentMethod || item.paymentStatus || "PAID") : "Completed · amount not recorded"}</span>
              </div>
            </article>
          )) : <p className="emptyState">No completed visits yet.</p>}
        </section>
      </div>
    </main>
  );
}

export default function AdminQueuePage() {
  return <AdminGate><QueueDashboard /></AdminGate>;
}
