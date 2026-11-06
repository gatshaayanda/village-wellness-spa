"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/app/admin/admin-gate";
import { auth } from "@/lib/firebase/client";
import { getPublicServices, type ServiceRecord } from "@/lib/firebase/data";

type Item = {
  id: string;
  name?: string;
  phone?: string;
  serviceNameSnapshot?: string;
  status: string;
  createdAt: string;
  recommendedReturnDate?: string;
  returnNote?: string;
  finalPrice?: string;
  finalPriceSnapshot?: string;
  paymentStatus?: string;
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
  const [returnDates, setReturnDates] = useState<Record<string, string>>({});
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const [finalPrices, setFinalPrices] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});

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
    void load().catch(error => setNotice(error.message));
    void getPublicServices().then(setServices).catch(() => setNotice("Treatments could not be loaded. Check the treatment catalogue in Admin."));
  }, [load]);

  async function update(id: string, status: string) {
    setBusy(id);
    setNotice("");
    try {
      const response = await fetch("/api/admin/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() },
        body: JSON.stringify({
          id,
          status,
          recommendedReturnDate: returnDates[id] || "",
          returnNote: returnNotes[id] || "",
          finalPrice: finalPrices[id] || "",
          paymentMethod: paymentMethods[id] || "CASH",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Visit update failed.");
      await load();
      setNotice(status === "COMPLETED"
        ? "Visit completed. The customer account now has the visit record and any saved receipt details."
        : "Visit status saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Visit update failed.");
    } finally {
      setBusy("");
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy("new");
    setNotice("");
    setShareLink("");
    try {
      const response = await fetch("/api/admin/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() },
        body: JSON.stringify({ action: "create", name, phone, serviceName: service }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Walk-in could not be registered.");
      if (data.claimToken) {
        const link = window.location.origin + "/account?claim=" + encodeURIComponent(data.claimToken);
        setShareLink("https://wa.me/" + phone.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent(
          "Welcome to Village Wellness Spa. Open your private customer account to keep your visit history and book again: " + link
        ));
        setSharePhone(phone);
      } else {
        setShareLink("");
        setNotice("Returning customer recognised. This visit is already connected to their account.");
      }
      setName("");
      setPhone("");
      setService("");
      await load();
      setNotice("Walk-in registered as Arrived. Send the customer their private account link on WhatsApp.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Walk-in could not be registered.");
    } finally {
      setBusy("");
    }
  }

  const active = items.filter(item => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status));
  const closed = items.filter(item => ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status));

  return (
    <main className="adminPage">
      <div className="adminShell">
        <header className="panelHeading">
          <div>
            <span className="kicker">VILLAGE WELLNESS SPA · TODAY</span>
            <h1>Walk-ins & visits</h1>
            <p>Two actions only: record arrival, then complete the visit when treatment and payment are done.</p>
          </div>
          <Link href="/admin" className="button buttonLight">Main admin</Link>
        </header>

        <section className="adminPanel">
          <h2>Register a walk-in</h2>
          <p>Only for customers physically at the spa. Returning customers are matched to their saved account when their details match.</p>
          <form className="adminForm" onSubmit={add}>
            <div className="formGrid">
              <label>Customer name<input value={name} onChange={event => setName(event.target.value)} required maxLength={120} /></label>
              <label>WhatsApp number<input value={phone} onChange={event => setPhone(event.target.value)} required maxLength={40} placeholder="+267 …" /></label>
              <label className="fieldFull">Treatment<select value={service} onChange={event => setService(event.target.value)} required><option value="">Choose from the live treatment catalogue</option>{services.map(item => <option key={item.id} value={item.name}>{item.name} · {item.price}</option>)}</select></label>
            </div>
            <button className="button buttonPrimary" type="submit" disabled={busy === "new"}>{busy === "new" ? "Registering…" : "Register customer as arrived ↗"}</button>
          </form>
          {shareLink && (
            <div className="customerPanel" role="status">
              <strong>Customer account link ready</strong>
              <p>Send the private visit link to {sharePhone}. Their visit will appear in their account after they open the link and sign in.</p>
              <a className="button buttonPrimary" href={shareLink} target="_blank" rel="noreferrer">Send account link on WhatsApp ↗</a>
            </div>
          )}
        </section>

        {notice && <p role="status" className="slotHint">{notice}</p>}

        <section className="adminPanel">
          <div className="panelHeading">
            <div><h2>At the spa <span>{active.length}</span></h2><p>Everyone here is marked Arrived. Complete the visit when treatment is finished and payment has been received.</p></div>
            <button className="button buttonLight" type="button" onClick={() => void load()}>Refresh</button>
          </div>
          {active.length === 0 ? <p className="emptyState">No walk-in visits have been registered today.</p> : active.map(item => (
            <article className="requestRow" key={item.id}>
              <div>
                <strong>{item.name || "Customer"} · {item.serviceNameSnapshot || "Visit"}</strong>
                <span>{item.phone} · {item.status.replaceAll("_", " ").toLowerCase()} · {new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Gaborone" })}</span>
              </div>
              <div className="actions">
                {item.status === "CONFIRMED" && <button className="button buttonLight" disabled={!!busy} onClick={() => void update(item.id, "ARRIVED")}>Mark arrived</button>}
                {["ARRIVED", "WAITING", "IN_TREATMENT"].includes(item.status) && (
                  <>
                    <div className="field">
                      <label>Amount received (P)<input inputMode="decimal" required value={finalPrices[item.id] || ""} onChange={event => setFinalPrices(values => ({ ...values, [item.id]: event.target.value }))} placeholder="Actual amount paid" /></label>
                      <label>Payment method<select value={paymentMethods[item.id] || "CASH"} onChange={event => setPaymentMethods(values => ({ ...values, [item.id]: event.target.value }))}><option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile money</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
                      <label>Suggested return date<input type="date" value={returnDates[item.id] || ""} onChange={event => setReturnDates(values => ({ ...values, [item.id]: event.target.value }))} /></label>
                      <label>Care / return note<input value={returnNotes[item.id] || ""} onChange={event => setReturnNotes(values => ({ ...values, [item.id]: event.target.value }))} placeholder="Optional practitioner guidance" /></label>
                    </div>
                    <button className="button buttonPrimary" disabled={!!busy || !finalPrices[item.id]?.trim()} onClick={() => void update(item.id, "COMPLETED")}>Complete visit · payment received</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="adminPanel">
          <h2>Completed today</h2>
          {closed.length ? closed.map(item => (
            <article className="requestRow" key={item.id}>
              <div>
                <strong>{item.name} · {item.serviceNameSnapshot}</strong>
                <span>{item.finalPriceSnapshot ? item.finalPriceSnapshot + " received · " + (item.paymentStatus || "PAID") : "Completed"}{item.recommendedReturnDate ? " · Suggested return " + item.recommendedReturnDate : ""}</span>
              </div>
            </article>
          )) : <p>No visits closed yet.</p>}
        </section>
      </div>
    </main>
  );
}

export default function AdminQueuePage() {
  return <AdminGate><QueueDashboard /></AdminGate>;
}
