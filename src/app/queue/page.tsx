"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getPublicServices, type ServiceRecord } from "@/lib/firebase/data";
import { trackUsage } from "@/lib/tripple-s/usage";

type QueueResult = { reference: string; claimToken: string; name: string; phone: string };

function whatsappDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("267")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 8 ? "267" + digits : "";
}

export default function QueuePage() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QueueResult | null>(null);

  useEffect(() => {
    trackUsage("walkin_queue_start", { category: "queue" });
    let active = true;
    void getPublicServices()
      .then(items => { if (active) setServices(items.filter(item => item.active)); })
      .catch(() => { if (active) setError("Treatments could not be loaded. Please refresh and try again."); })
      .finally(() => { if (active) setServicesLoading(false); });
    return () => { active = false; };
  }, []);

  async function joinQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/customer/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name, phone, serviceId }),
      });
      const data = await response.json() as { reference?: string; claimToken?: string; error?: string };
      if (!response.ok || !data.reference || !data.claimToken) throw new Error(data.error || "Your queue entry could not be saved. Please try again.");
      setResult({ reference: data.reference, claimToken: data.claimToken, name: name.trim(), phone });
      trackUsage("walkin_queue_join_success", { category: "queue", outcome: "available" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your queue entry could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const accountUrl = result ? window.location.origin + "/account?claim=" + encodeURIComponent(result.claimToken) + "&welcome=1" : "";
  const digits = result ? whatsappDigits(result.phone) : "";
  const whatsappUrl = result && digits
    ? "https://wa.me/" + digits + "?text=" + encodeURIComponent(
        "Welcome to Village Wellness Spa. Your walk-in queue entry is saved. Open your private account to keep your visit history and book your next treatment: " + accountUrl + "\n\nVillage Wellness Spa · Gaborone"
      )
    : "";

  return (
    <main className="villageQueuePage">
      <header className="villageQueueHeader">
        <Link href="/" className="brand" aria-label="Village Wellness Spa home">
          <span className="brandMark"><img src="/icon.svg" alt="" /></span>
          <span>Village<span>WELLNESS SPA</span></span>
        </Link>
        <Link href="/account">My account ↗</Link>
      </header>

      <div className="villageQueueWrap">
        <Link href="/" className="villageQueueBack">← Back to Village Wellness Spa</Link>
        {!result ? (
          <section className="villageQueueCard" aria-labelledby="queue-title">
            <span className="villageRefreshEyebrow">VILLAGE WELLNESS SPA · WALK-IN</span>
            <h1 id="queue-title">Join the queue.</h1>
            <p className="villageQueueIntro">You’re here. Share a few details and the spa team can see your arrival and the treatment you’re interested in.</p>
            <form onSubmit={joinQueue}>
              <label>Your name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={120} required placeholder="Full name" /></label>
              <label>WhatsApp number<input value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" maxLength={24} required placeholder="+267 7X XXX XXX" /></label>
              <label>What treatment are you here for?
                <select value={serviceId} onChange={event => { setServiceId(event.target.value); if (event.target.value) trackUsage("treatment_selected", { category: "queue" }); }} disabled={servicesLoading}>
                  <option value="">{servicesLoading ? "Loading treatments…" : "Help me choose / consultation"}</option>
                  {services.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <p className="villageQueuePrivacy">Your details are used to record this visit and prepare your private account link. The WhatsApp message is not sent until you press Send.</p>
              {error && <p className="villageQueueError" role="alert">{error}</p>}
              <button className="villageQueueSubmit" type="submit" disabled={busy || servicesLoading}>{busy ? "Saving your arrival…" : "Join the queue ↗"}</button>
            </form>
            <p className="villageQueueAlternative">Planning a future visit instead? <Link href="/book">Book an appointment ↗</Link></p>
          </section>
        ) : (
          <section className="villageQueueCard villageQueueSuccess" aria-labelledby="queue-success-title">
            <span className="villageQueueSuccessMark" aria-hidden="true">✓</span>
            <span className="villageRefreshEyebrow">VILLAGE WELLNESS SPA · WALK-IN</span>
            <h1 id="queue-success-title">You’re in the queue.</h1>
            <p className="villageQueueIntro"><strong>{result.name}</strong>, your walk-in entry has been saved for the spa team.</p>
            <div className="villageQueueReference"><span>Queue reference</span><strong>{result.reference}</strong></div>
            {whatsappUrl ? (
              <>
                <a className="villageQueueSubmit" href={whatsappUrl} target="_blank" rel="noreferrer">Send your account link to WhatsApp ↗</a>
                <p className="villageQueuePrivacy">WhatsApp will open with your private account link ready. Check the message and press <strong>Send</strong>. Open the link on your phone to connect this visit to your account, keep your history and book again. The secure link expires in seven days.</p>
              </>
            ) : <p className="villageQueueError">We could not prepare the WhatsApp number. Please contact reception and quote {result.reference}.</p>}
            <Link className="villageQueueSecondaryAction" href={accountUrl}>Open my account ↗</Link>
            <Link className="villageQueueSecondaryAction" href="/book">Book a future appointment ↗</Link>
            <Link className="villageQueueSecondaryAction" href="/">Return to the spa homepage</Link>
          </section>
        )}
      </div>
    </main>
  );
}
