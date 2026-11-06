"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { auth, hasFirebaseWebConfig } from "@/lib/firebase/client";
import NotificationSettings from "@/components/NotificationSettings";

type Booking = {
  id: string;
  reference: string;
  createdAt: string;
  serviceName: string;
  requestType?: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  statusUpdatedAt?: string;
  paymentStatus?: string;
  finalPrice?: string;
  offerCode?: string;
};
type Offer = {
  id: string;
  title: string;
  description: string;
  code: string;
  discountType: "PERCENT" | "AMOUNT";
  value: number;
  eligibility: "ALL" | "RETURNING";
  startDate?: string;
  endDate?: string;
};

const statusCopy: Record<string, string> = {
  NEW: "Request received",
  REVIEWING: "Under review",
  APPROVED: "Reviewed",
  PAYMENT_PENDING: "Awaiting next steps",
  CONFIRMED: "Appointment confirmed",
  ARRIVED: "Checked in",
  COMPLETED: "Visit completed",
  NEEDS_CONTACT: "The team needs to contact you",
  DECLINED: "Request declined",
  RESCHEDULED: "Rescheduling needed",
  CANCELLED: "Cancelled",
  NO_SHOW: "Missed appointment",
  FOLLOW_UP: "Follow-up",
};

const statusGuidance: Record<string, string> = {
  NEW: "The spa team has received your request and will review it. Your preferred time is not confirmed yet.",
  REVIEWING: "The team is reviewing your treatment and preferred time. They will update this request when the review is complete.",
  APPROVED: "Your request has been reviewed. Check any message from the spa for next steps; the appointment is not confirmed until its status says Appointment confirmed.",
  PAYMENT_PENDING: "The team has updated your request. Check any message from the spa for the next step; this status does not mean a payment has been received.",
  CONFIRMED: "Your appointment is confirmed. Keep the date and time above handy, and contact the spa if you need to make a change.",
  ARRIVED: "Your visit has been checked in. The spa team will guide you through the appointment.",
  COMPLETED: "The spa has marked this visit as complete. You can request another visit whenever you are ready.",
  NEEDS_CONTACT: "The team needs to speak with you before this request can progress. Please contact the spa using its usual contact channel.",
  DECLINED: "This request was declined. Contact the spa if you would like to discuss another date or treatment.",
  RESCHEDULED: "The requested time needs to change. Please contact the spa or submit a new request with another preferred time.",
  CANCELLED: "This request is cancelled and is no longer holding the requested slot. You can submit a new request if needed.",
  NO_SHOW: "This visit was marked as missed. Contact the spa if you would like to arrange another appointment.",
  FOLLOW_UP: "The spa team has marked this request for follow-up. Watch for a message from the team.",
};

const waitlistGuidance: Record<string, string> = {
  NEW: "Your waitlist request is with the spa team. It does not reserve a treatment slot; the team will contact you if a suitable opening can be offered.",
  REVIEWING: "The team is checking whether the treatment, practitioner and room can fit your preferred timing. No appointment is reserved yet.",
  APPROVED: "Your waitlist request has been reviewed. The team will contact you if they can offer a suitable opening. This is not an appointment confirmation.",
  NEEDS_CONTACT: "The spa team needs to speak with you about your waitlist preference. Please contact the team using its usual contact channel.",
  DECLINED: "The team cannot offer a suitable opening for this waitlist request. Contact the spa if you would like to discuss another preference.",
  RESCHEDULED: "The team has updated the timing preference on your waitlist request. Check with the spa for the latest details.",
  CANCELLED: "Your waitlist request has been cancelled. You can submit another request if needed.",
  FOLLOW_UP: "The spa team has marked your waitlist request for follow-up. Watch for a message from the team.",
};

const paymentCopy: Record<string, string> = {
  PAYMENT_PENDING: "Not yet marked as paid",
  PAYMENT_INSTRUCTIONS: "Payment instructions provided",
  PAYMENT_PROOF_SUBMITTED: "Payment proof submitted · awaiting verification",
  PAYMENT_VERIFIED: "Payment verified",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

function AccountContent() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showExistingAccount, setShowExistingAccount] = useState(false);
  const [showPostSubmit, setShowPostSubmit] = useState(false);

  const loadBookings = useCallback(async (activeUser: User) => {
    const response = await fetch("/api/customer/bookings", {
      cache: "no-store",
      headers: { Authorization: "Bearer " + await activeUser.getIdToken() },
    });
    const result = await response.json() as { items?: Booking[]; error?: string };
    if (!response.ok) throw new Error(result.error || "Appointment history could not be loaded.");
    setBookings(result.items ?? []);
  }, []);

  useEffect(() => {
    let alive = true;
    setShowPostSubmit(new URLSearchParams(window.location.search).has("submitted"));

    const unsubscribe = onAuthStateChanged(auth, async (activeUser) => {
      if (!alive) return;
      if (!activeUser && hasFirebaseWebConfig) {
        try {
          await setPersistence(auth, browserLocalPersistence);
          await signInAnonymously(auth);
          return;
        } catch {
          if (alive) {
            setMessage("Your request is saved, but account history is unavailable until customer sign-in is configured.");
            setLoading(false);
          }
          return;
        }
      }
      if (!activeUser) {
        setLoading(false);
        return;
      }
      setUser(activeUser);
      try {
        await loadBookings(activeUser);
      } catch (error) {
        if (alive) setMessage(error instanceof Error ? error.message : "Your appointment history could not be loaded.");
      } finally {
        if (alive) setLoading(false);
      }
    });

    void fetch("/api/offers", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ items?: Offer[] }> : { items: [] })
      .then((result) => { if (alive) setOffers(result.items ?? []); })
      .catch(() => { if (alive) setOffers([]); });

    return () => { alive = false; unsubscribe(); };
  }, [loadBookings]);

  async function connectGoogle() {
    if (!user) return;
    setBusy(true);
    setMessage("");
    setShowExistingAccount(false);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await linkWithPopup(user, new GoogleAuthProvider());
      const current = auth.currentUser;
      if (current) {
        setUser(current);
        await loadBookings(current);
        const response = await fetch("/api/customer/profile", {
          method: "POST",
          headers: { Authorization: "Bearer " + await current.getIdToken() },
        });
        if (!response.ok) throw new Error("Google is connected, but your contact profile could not be updated. Please retry.");
      }
      setMessage("Your Google account is connected. Your appointment history stays linked to this customer profile.");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code) : "";
      if (["auth/credential-already-in-use", "auth/email-already-in-use", "auth/account-exists-with-different-credential"].includes(code)) {
        setShowExistingAccount(true);
        setMessage("This Google account already has a separate Village Wellness Spa profile. Sign in to it below; separate histories are never merged automatically.");
      } else if (code === "auth/provider-already-linked") {
        setMessage("Google is already connected to this profile.");
      } else if (["auth/operation-not-allowed", "auth/configuration-not-found", "auth/unauthorized-domain"].includes(code)) {
        setMessage("Google sign-in is not enabled for this site yet. Your appointment request remains saved.");
      } else if (code === "auth/popup-closed-by-user") {
        setMessage("Google connection was cancelled. Your current profile is unchanged.");
      } else if (code === "auth/popup-blocked") {
        setMessage("Your browser blocked the sign-in window. Allow pop-ups for Village Wellness Spa and try again.");
      } else {
        setMessage(error instanceof Error ? error.message : "Google could not be connected. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function signIntoExistingGoogleAccount() {
    setBusy(true);
    setMessage("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      setUser(credential.user);
      setShowExistingAccount(false);
      await loadBookings(credential.user);
      setMessage("You are signed in to your existing Village Wellness Spa profile. Any previous guest-session history remains separate.");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code) : "";
      setMessage(code === "auth/popup-closed-by-user" ? "Sign-in was cancelled." : "The existing Google profile could not be opened. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bookPage bookPageEditorial customerAccount">
      <nav className="nav">
        <div className="container navInner">
          <Link href="/" className="brand" aria-label="Village Wellness Spa home">
            <span className="brandMark"><img src="/icon.svg" alt="" /></span>
            <span>Village<span>WELLNESS SPA</span></span>
          </Link>
          <div className="navLinks"><Link href="/treatments">Treatments</Link><Link href="/book?newBooking=1">Book a visit</Link></div>
          <Link href="/book?newBooking=1" className="button buttonPrimary">New request ↗</Link>
        </div>
      </nav>

      <div className="container customerAccountShell">
        <header className="customerAccountHeader">
          <span className="kicker">YOUR SPA, IN ONE PLACE</span>
          <h1>My account</h1>
          <p>Follow appointment and waitlist requests, keep your details together and manage updates.</p>
        </header>

        {showPostSubmit && (
          <section className="customerPanel customerSetupIntro">
            <div>
              <span className="kicker">REQUEST RECEIVED</span>
              <h2>Your next step, when you’re ready.</h2>
              <p>Your request is saved. The spa team will review it and contact you. It is not confirmed until the team updates its status.</p>
            </div>
            <a href="#my-visits" className="button buttonPrimary">View my request ↓</a>
          </section>
        )}

        {!hasFirebaseWebConfig && (
          <section className="customerPanel">
            <h2>Account sign-in is being set up.</h2>
            <p>You can still request an appointment as a guest. Keep the booking reference shown after submission.</p>
            <Link href="/book?newBooking=1" className="button buttonPrimary">Request an appointment ↗</Link>
          </section>
        )}

        {loading ? (
          <section className="customerPanel customerLoading" role="status">Loading your appointment history…</section>
        ) : user ? (
          <>
            <section className="customerPanel" id="my-visits">
              <div className="customerPanelHeading">
                <div><span className="kicker">YOUR REQUESTS & VISITS</span><h2>My visits</h2></div>
                <Link href="/book?newBooking=1" className="textLink">Request a visit ↗</Link>
              </div>
              {bookings.length === 0 ? (
                <div className="customerEmpty">
                  <strong>No appointment requests yet.</strong>
                  <p>Your requests will appear here, with the latest status and next step.</p>
                  <Link href="/book?newBooking=1" className="button buttonPrimary">Choose a treatment ↗</Link>
                </div>
              ) : (
                <div className="customerBookingList">
                  {bookings.map((booking) => (
                    <article className="customerBooking" key={booking.id}>
                      <div className="customerBookingMain">
                        <span className="kicker">{booking.requestType === "WAITLIST" ? "WAITLIST · REF " + booking.reference : "REF " + booking.reference}</span>
                        <h3>{booking.serviceName}</h3>
                        <p>{booking.requestType === "WAITLIST" ? "Preferred: " + (booking.preferredDate || "Any suitable date") + (booking.preferredTime ? " · " + booking.preferredTime : " · Flexible time") : (booking.preferredDate || "Date to be arranged") + (booking.preferredTime ? " · " + booking.preferredTime : "")}</p>
                        <small>Requested {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-GB", { timeZone: "Africa/Gaborone" }) : "recently"}{booking.finalPrice ? " · " + booking.finalPrice : ""}</small>
                      </div>
                      <div className="customerBookingProgress">
                        <span className="customerStatus">{statusCopy[booking.status] || booking.status}</span>
                        <p>{booking.requestType === "WAITLIST" ? waitlistGuidance[booking.status] || "Your waitlist request is being reviewed by the spa team. It does not reserve an appointment slot." : statusGuidance[booking.status] || "The spa team will update this request when its status changes."}</p>
                        {booking.statusUpdatedAt && <small>Status updated {new Date(booking.statusUpdatedAt).toLocaleString("en-GB", { timeZone: "Africa/Gaborone", dateStyle: "medium", timeStyle: "short" })}</small>}
                        {booking.requestType !== "WAITLIST" && <small>Payment: {paymentCopy[booking.paymentStatus || "PAYMENT_PENDING"] || booking.paymentStatus}. Appointment status and payment status are tracked separately.</small>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <p className="customerAccountTruth">A request is not an appointment confirmation or payment receipt. The spa team updates your status after review.</p>
            </section>

            <section className="customerPanel" id="profile">
              <div className="customerPanelHeading">
                <div><span className="kicker">ACCOUNT ACCESS</span><h2>{user.isAnonymous ? "Keep your history" : "Your profile is connected"}</h2></div>
                <span className="customerAccountState">{user.isAnonymous ? "Guest profile" : "Google connected"}</span>
              </div>
              {user.isAnonymous ? (
                <>
                  <p>Your current guest history is saved to this browser session. Connect Google to make it easier to return to the same profile on another device.</p>
                  <div className="actions">
                    <button className="button buttonPrimary" type="button" disabled={busy} onClick={() => void connectGoogle()}>{busy ? "Connecting…" : "Secure my account with Google ↗"}</button>
                    {showExistingAccount && <button className="button buttonLight" type="button" disabled={busy} onClick={() => void signIntoExistingGoogleAccount()}>Sign in to existing account</button>}
                  </div>
                </>
              ) : (
                <p>Your appointment history is linked to this Google account. Separate customer histories are never merged without your choice.</p>
              )}
            </section>

            <section className="customerPanel customerNotifications" id="notifications">
              <NotificationSettings />
            </section>

            {offers.length > 0 && (
              <section className="customerPanel" id="offers">
                <div className="customerPanelHeading"><div><span className="kicker">FROM THE SPA</span><h2>Current offers</h2></div></div>
                <div className="customerOfferList">
                  {offers.map((offer) => (
                    <article className="customerOffer" key={offer.id}>
                      <div>
                        <span className="kicker">{offer.eligibility === "RETURNING" ? "RETURNING CLIENTS" : "PUBLISHED OFFER"}</span>
                        <h3>{offer.title}</h3>
                        <p>{offer.description}</p>
                        <small>Code: <strong>{offer.code}</strong> · {offer.discountType === "PERCENT" ? offer.value + "% off" : "P" + offer.value.toLocaleString("en-BW") + " off"}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}

        {message && <p className="notice customerAccountMessage" role="status">{message}</p>}
        <footer className="customerAccountFooter">
          <Link href="/" className="textLink">← Back to Village Wellness Spa</Link>
          <p>Your appointment and contact details are private. Please do not submit sensitive medical information through the website.</p>
        </footer>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return <AccountContent />;
}
