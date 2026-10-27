"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type EnquiryKind = "PRODUCT" | "TREATMENT" | "GENERAL";

export default function EnquiryModal({
  open, onClose, kind, itemId, itemName, itemPrice,
}: {
  open: boolean; onClose: () => void; kind: EnquiryKind; itemId?: string; itemName?: string; itemPrice?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!open) { setBusy(false); setError(""); setSubmitted(false); setReference(""); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape" && !busy) onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;
  const heading = kind === "PRODUCT" ? "Ask about product availability" : kind === "TREATMENT" ? "Ask about this treatment" : "Send Village Wellness Spa an enquiry";
  const intro = kind === "PRODUCT"
    ? "Tell us how to reach you. The team will check current availability and follow up during clinic operating hours."
    : kind === "TREATMENT"
      ? "Ask a question before deciding. The clinical team will respond and advise on the appropriate next step."
      : "Share a question or tell us what you need help with. The team will follow up during clinic operating hours.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind, itemId,
          name: String(form.get("name") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          message: String(form.get("message") ?? "").trim(),
          website: String(form.get("website") ?? "").trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your enquiry could not be sent. Please try again.");
      setReference(String(result.reference || result.id || "").slice(0, 8).toUpperCase());
      setSubmitted(true);
    } catch (err) {
      console.error("[Village Wellness Spa] enquiry submission failed", err);
      setError(err instanceof Error ? err.message : "Your enquiry could not be sent. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="enquiryBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="enquiryDialog" role="dialog" aria-modal="true" aria-labelledby="enquiry-title" aria-describedby="enquiry-description">
        <button className="enquiryClose" type="button" aria-label="Close enquiry" onClick={onClose} disabled={busy}>×</button>
        <span className="enquirySpark" aria-hidden="true">✦</span>
        <span className="kicker">VILLAGE WELLNESS SPA · CLIENT CARE</span>
        <h2 id="enquiry-title">{submitted ? "Your enquiry is with the team." : heading}</h2>
        <p id="enquiry-description">{submitted ? "Thank you. Keep this reference for your records. This is an enquiry receipt, not an appointment confirmation." : intro}</p>
        {itemName && <div className="enquiryItem"><strong>{itemName}</strong>{itemPrice && <span>{itemPrice}</span>}</div>}
        {submitted ? (
          <div className="enquirySuccess" role="status"><span>✓</span><strong>Enquiry received</strong>{reference && <small>Reference #{reference}</small>}<button className="button buttonPrimary" type="button" onClick={onClose}>Back to Village Wellness Spa</button></div>
        ) : (
          <form className="enquiryForm" onSubmit={submit}>
            <label>Your name<input name="name" autoComplete="name" required maxLength={120} placeholder="Full name" /></label>
            <label>WhatsApp / mobile<input name="phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="Best contact number" /></label>
            <label>Email <span>(optional)</span><input name="email" type="email" autoComplete="email" maxLength={200} placeholder="you@example.com" /></label>
            <label>Your question <span>(optional)</span><textarea name="message" maxLength={1000} placeholder={kind === "PRODUCT" ? "Ask about current availability or product details." : "What would you like the team to know?"} /></label>
            <div className="enquiryHoneypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            {error && <p className="enquiryError" role="alert">{error}</p>}
            <button className="button buttonPrimary enquirySubmit" type="submit" disabled={busy}>{busy ? "Sending enquiry…" : "Send enquiry"} <span aria-hidden="true">→</span></button>
            <small>Your details are used to respond to this enquiry. Please do not include sensitive medical information.</small>
          </form>
        )}
      </section>
    </div>
  );
}
