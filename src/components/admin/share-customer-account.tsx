"use client";

import { useMemo, useState } from "react";

function normalizeBotswanaNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("267")) return digits;
  if (digits.startsWith("0")) return "267" + digits.slice(1);
  return digits;
}

export default function ShareCustomerAccount() {
  const [contacts, setContacts] = useState("");
  const [copied, setCopied] = useState(false);
  const accountUrl = typeof window === "undefined" ? "" : window.location.origin + "/account?welcome=1";
  const parsed = useMemo(() => {
    const unique = new Set<string>();
    return contacts.split(/[\n,;]+/).map(value => value.trim()).filter(Boolean).map(raw => ({
      raw,
      phone: normalizeBotswanaNumber(raw),
    })).filter(item => item.phone.length >= 8 && item.phone.length <= 15 && !unique.has(item.phone) && Boolean(unique.add(item.phone)));
  }, [contacts]);

  function shareUrl(phone: string) {
    const message = "Welcome to Village Wellness Spa. Open your customer account here: " + accountUrl + "\n\nFor the best experience, open the link in Google Chrome. You can review your spa visits, choose treatments, make your next booking and keep up with offers. No need to fill in a reception form.";
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
  }

  async function copyLink() {
    if (!accountUrl) return;
    try {
      await navigator.clipboard.writeText(accountUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="adminPanel shareCustomerPanel">
      <div className="panelHeading">
        <div>
          <span className="kicker">CUSTOMER ONBOARDING</span>
          <h2>Share a customer account</h2>
          <p>Send customers straight to their Village Wellness Spa account. They can review visits, choose treatments, book again and see offers.</p>
        </div>
        <span className="shareCustomerIcon" aria-hidden="true">↗</span>
      </div>
      <label className="shareCustomerLabel" htmlFor="spa-share-contacts">WhatsApp contact or contacts</label>
      <textarea
        id="spa-share-contacts"
        value={contacts}
        onChange={event => setContacts(event.target.value)}
        rows={3}
        placeholder={"+267 7X XXX XXX\n+267 7X XXX XXX"}
        autoComplete="off"
        inputMode="tel"
      />
      <p className="shareCustomerHint">Add one number per line, or separate contacts with commas. Botswana numbers starting with 0 or 7 are normalised to +267. Each contact gets their own WhatsApp share link.</p>
      <div className="shareCustomerActions">
        <button type="button" className="button buttonLight" onClick={() => void copyLink()} disabled={!accountUrl}>
          {copied ? "Account link copied" : "Copy account link"}
        </button>
        <span>{parsed.length} valid contact{parsed.length === 1 ? "" : "s"}</span>
      </div>
      {contacts.trim() && parsed.length === 0 && <p className="shareCustomerError" role="status">Enter a valid WhatsApp number with its country code, or a Botswana mobile number.</p>}
      {parsed.length > 0 && (
        <div className="shareCustomerList">
          {parsed.map(item => (
            <div className="shareCustomerContact" key={item.phone}>
              <span>{item.raw}</span>
              <a className="button buttonPrimary" href={shareUrl(item.phone)} target="_blank" rel="noreferrer">Share on WhatsApp ↗</a>
            </div>
          ))}
        </div>
      )}
      <p className="shareCustomerFootnote">WhatsApp opens with a prepared message; staff reviews it and presses Send. Ask customers to open the shared domain in Google Chrome if WhatsApp opens its in-app browser.</p>
    </section>
  );
}
