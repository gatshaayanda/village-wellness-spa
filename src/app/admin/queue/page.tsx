"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/app/admin/admin-gate";
import { auth } from "@/lib/firebase/client";

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
};

function QueueDashboard() {
  const [items, setItems] = useState<Item[]>([]);
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
      const link = window.location.origin + "/account?claim=" + encodeURIComponent(data.claimToken);
      setShareLink("https://wa.me/" + phone.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent(
        "Thank you for visiting Village Wellness Spa. Your private visit record and receipt will be available in your customer account once the team completes your visit: " + link
      ));
      setSharePhone(phone);
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
            <p>Reception records arrivals. The team updates each visit as care progresses.</p>
          </div>
          <Link href="/admin" className="button buttonLight">Main admin</Link>
        </header>

        <section className="adminPanel">
          <h2>Register a walk-in</h2>
          <p>For a customer who is at the spa. Add their details once; send their account link so the completed visit and receipt can be viewed later.</p>
          <form className="adminForm" onSubmit={add}>
            <div className="formGrid">
              <label>Customer name<input value={name} onChange={event => setName(event.target.value)} required maxLength={120} /></label>
              <label>WhatsApp number<input value={phone} onChange={event => setPhone(event.target.value)} required maxLength={40} placeholder="+267 …" /></label>
              <label className="fieldFull">Treatment<input value={service} onChange={event => setService(event.target.value)} required maxLength={160} placeholder="Treatment or consultation" /></label>
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
            <div><h2>In progress <span>{active.length}</span></h2><p>Move each customer through the work actually completed by the team.</p></div>
            <button className="button buttonLight" type="button" onClick={() => void load()}>Refresh</button>
          </div>
          {active.length === 0 ? <p className="emptyState">No walk-in visits have been registered today.</p> : active.map(item => (
            <article className="requestRow" key={item.id}>
              <div>
                <strong>{item.name || "Customer"} · {item.serviceNameSnapshot || "Visit"}</strong>
                <span>{item.phone} · {item.status.replaceAll("_", " ").toLowerCase()} · {new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Gaborone" })}</span>
              </div>
              <div className="actions">
                {item.status === "ARRIVED" && <button className="button buttonLight" disabled={!!busy} onClick={() => void update(item.id, "WAITING")}>Mark waiting</button>}
                {item.status === "WAITING" && <button className="button buttonLight" disabled={!!busy} onClick={() => void update(item.id, "IN_TREATMENT")}>Start treatment</button>}
                {item.status === "IN_TREATMENT" && (
                  <>
                    <div className="field">
                      <label>Final visit amount (P)<input inputMode="decimal" value={finalPrices[item.id] || ""} onChange={event => setFinalPrices(values => ({ ...values, [item.id]: event.target.value }))} placeholder="Optional" /></label>
                      <label>Suggested return date<input type="date" value={returnDates[item.id] || ""} onChange={event => setReturnDates(values => ({ ...values, [item.id]: event.target.value }))} /></label>
                      <label>Care / return note<input value={returnNotes[item.id] || ""} onChange={event => setReturnNotes(values => ({ ...values, [item.id]: event.target.value }))} placeholder="Optional practitioner guidance" /></label>
                    </div>
                    <button className="button buttonPrimary" disabled={!!busy} onClick={() => void update(item.id, "COMPLETED")}>Confirm visit completed</button>
                  </>
                )}
                {["ARRIVED", "WAITING"].includes(item.status) && <button className="button buttonLight" disabled={!!busy} onClick={() => void update(item.id, "CANCELLED")}>Cancel visit</button>}
                {item.status === "IN_TREATMENT" && <button className="button buttonLight" disabled={!!busy} onClick={() => void update(item.id, "CANCELLED")}>Cancel visit</button>}
              </div>
            </article>
          ))}
        </section>

        <section className="adminPanel">
          <h2>Completed & closed today</h2>
          {closed.length ? closed.map(item => (
            <article className="requestRow" key={item.id}>
              <div>
                <strong>{item.name} · {item.serviceNameSnapshot}</strong>
                <span>{item.status.replaceAll("_", " ")}{item.finalPriceSnapshot ? " · " + item.finalPriceSnapshot : ""}{item.recommendedReturnDate ? " · Suggested return " + item.recommendedReturnDate : ""}</span>
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
