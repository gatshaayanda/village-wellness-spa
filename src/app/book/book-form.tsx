"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getIdToken, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, hasFirebaseWebConfig } from "@/lib/firebase/client";
import type { FormEvent } from "react";
import { getClinicSettings, getPublicServices, type ServiceRecord } from "@/lib/firebase/data";
import { defaultClinicSettings, dayLabels, isAnnouncementVisible, parseDurationMinutes, type ClinicSettings, type DayKey } from "@/lib/tripple-s/clinic-settings";
import { trackUsage } from "@/lib/tripple-s/usage";
import SpaWeatherReport from "@/components/SpaWeatherReport";

function localDateValue() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function BookForm() {
  const searchParams = useSearchParams();
  const requestedService = searchParams.get("service") ?? "";
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [hasConnectedAccount, setHasConnectedAccount] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(defaultClinicSettings);
  const [preferredDate, setPreferredDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [serviceId, setServiceId] = useState(requestedService);
  const minDate = localDateValue();

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const googleProfile = user?.providerData.find((provider) => provider.providerId === "google.com");
      setHasConnectedAccount(Boolean(user && !user.isAnonymous));
      setHasSavedProfile(false);
      setCustomerName(user?.displayName || googleProfile?.displayName || "");
      setCustomerPhone(user?.phoneNumber ?? "");
      setCustomerEmail(user?.email || googleProfile?.email || "");
      if (!user) return;
      try {
        const token = await getIdToken(user);
        const response = await fetch("/api/customer/profile", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        if (!response.ok) return;
        const profile = await response.json() as { name?: string; phone?: string; email?: string };
        if (cancelled || auth.currentUser?.uid !== user.uid) return;
        // Saved contact details take precedence over provider data because the customer may
        // have corrected their preferred name or WhatsApp number on an earlier request.
        setCustomerName(profile.name || user.displayName || googleProfile?.displayName || "");
        setCustomerPhone(profile.phone || user.phoneNumber || "");
        setCustomerEmail(profile.email || user.email || googleProfile?.email || "");
        setHasSavedProfile(Boolean(profile.name && profile.phone));
      } catch (profileError) {
        console.warn("[Village Wellness Spa] saved customer details unavailable; using account details", profileError);
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  useEffect(() => {
    void Promise.all([getPublicServices(), getClinicSettings()])
      .then(([items, settings]) => { setServices(items.filter((item) => item.active)); setClinicSettings(settings); })
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => setServiceId(requestedService), [requestedService]);
  useEffect(() => {
    if (!showTimePicker) return;
    const dialog = document.querySelector<HTMLElement>(".timePickerDialog");
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setShowTimePicker(false); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [showTimePicker]);

  const selected = useMemo(() => services.find((item) => item.id === serviceId), [services, serviceId]);
  const selectedDuration = String(parseDurationMinutes(selected?.duration, 30));
  const slotGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const time of availableSlots) {
      const hour = time.slice(0, 2);
      (groups[hour] ??= []).push(time);
    }
    return Object.entries(groups).sort(([hourA], [hourB]) => hourA.localeCompare(hourB)).map(([hour, times]) => [hour, times.sort((a, b) => a.localeCompare(b))] as [string, string[]]);
  }, [availableSlots]);

  useEffect(() => {
    setSelectedTime(""); setAvailableSlots([]); setAvailabilityError(""); setAvailabilityNote("");
    if (!preferredDate) { setLoadingSlots(false); return; }
    let cancelled = false; setLoadingSlots(true);
    fetch("/api/availability?date=" + encodeURIComponent(preferredDate) + "&duration=" + encodeURIComponent(selectedDuration))
      .then(async response => { const data=await response.json(); if(!response.ok) throw new Error(data.error||"Could not load available times."); return data as {slots:string[];note?:string}; })
      .then(data=>{if(!cancelled){setAvailableSlots(data.slots||[]);setAvailabilityNote(data.note||"");trackUsage("availability_result",{outcome:data.slots?.length?"available":"empty"});}})
      .catch(error=>{if(!cancelled){setAvailabilityError(error instanceof Error?error.message:"Could not load available times.");trackUsage("availability_result",{outcome:"error"});}})
      .finally(()=>{if(!cancelled)setLoadingSlots(false);});
    return ()=>{cancelled=true;};
  }, [preferredDate, selectedDuration, availabilityRetry]);
  const dayKeys: DayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const selectedDay = preferredDate ? dayKeys[new Date(`${preferredDate}T12:00:00`).getDay()] : null;
  const selectedHours = selectedDay ? clinicSettings.openingHours[selectedDay] : undefined;
  const showAnnouncement = isAnnouncementVisible(clinicSettings);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");

    const requestedDate = String(form.get("date") ?? "").trim();
    if (!requestedDate || !selectedTime) { setError("Choose a date and one of the available appointment times."); setBusy(false); return; }
    const requestedDay = dayKeys[new Date(requestedDate + "T12:00:00").getDay()];
    const requestedHours = clinicSettings.openingHours[requestedDay];
    if (!requestedHours?.open || !availableSlots.includes(selectedTime)) { setError("That time is no longer available. Please choose another slot."); setBusy(false); return; }
    const service = services.find((item) => item.id === String(form.get("serviceId") ?? ""));
    const email = String(form.get("email") ?? "").trim();
    const preferredTime = selectedTime;
    const message = String(form.get("message") ?? "").trim();
    const discountCode = String(form.get("discountCode") ?? "").trim();
    const request = {
      createdAt: new Date().toISOString(),
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      serviceNameSnapshot: service?.name || "Consultation / help choosing",
      status: "NEW" as const,
      paymentStatus: "PAYMENT_PENDING" as const,
      ...(email ? { email } : {}),
      ...(service ? { serviceId: service.id, priceSnapshot: service.price, durationSnapshot: service.duration } : {}),
      ...(requestedDate ? { preferredDate: requestedDate } : {}),
      ...(preferredTime ? { preferredTime } : {}),
      ...(message ? { message } : {}),
      ...(discountCode ? { discountCode } : {}),
    };

    if (!request.name || !request.phone) {
      setError("Please enter your name and WhatsApp/mobile number so the team can reply.");
      setBusy(false);
      return;
    }

    try {
      const headers: Record<string,string>={"Content-Type":"application/json"};
      // Keep identity setup invisible; booking must never require a customer account.
      if(hasFirebaseWebConfig){try{const customer=auth.currentUser??(await signInAnonymously(auth)).user;headers.Authorization="Bearer "+await getIdToken(customer);}catch(authError){console.warn("[Village Wellness Spa] optional customer session unavailable; continuing with booking",authError);}}
      const response = await fetch("/api/bookings", { method: "POST", headers, body: JSON.stringify({ ...request, time: selectedTime, discountCode }) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && String(result.error ?? "").toLowerCase().includes("just taken that slot")) trackUsage("booking_conflict");
        throw new Error(result.error || "The appointment could not be booked.");
      }
      trackUsage("booking_submit_success");
      setReference(String(result.reference || result.id).slice(0, 8).toUpperCase());
      setSubmitted(true);
      formElement.reset();
    } catch (err) {
      console.error("[Village Wellness Spa] appointment booking failed", err);
      setError(err instanceof Error ? err.message : "We could not complete your booking. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="bookPage bookPageEditorial">
    <nav className="nav"><div className="container navInner"><Link href="/" className="brand" aria-label="Village Wellness Spa home"><span className="brandMark"><img src="/icon.svg" alt="" /></span><span>Village<span>WELLNESS SPA</span></span></Link><div className="navLinks"><Link href="/treatments" className="textLink">Browse treatments & prices</Link><Link href="/account" className="textLink">My Village Wellness Spa</Link></div><Link href="/account" className="button buttonLight mobileAccountLink">My account</Link></div></nav>
    {showAnnouncement && <div className="container publicAnnouncement" role="status"><strong>{clinicSettings.announcement.title || "Clinic notice"}</strong><span>{clinicSettings.announcement.message}</span></div>}
    <div className="bookingIntro"><div className="bookingIntroInner"><span className="kicker">VILLAGE WELLNESS SPA · GABORONE</span><h1>Book your <em>spa visit.</em></h1><p>Choose your treatment and a time that suits you. Your available slot is reserved when you book.</p><div className="bookingSteps"><span><b>1</b> Treatment</span><span><b>2</b> Date &amp; time</span><span><b>3</b> Your details</span></div></div></div>
    <div className="formWrap formWrapWide">
      {submitted ? <div className="formCard confirm confirmEditorial"><span className="confirmIcon">✦</span><span className="kicker">BOOKING CONFIRMED</span><h2>Your appointment is booked.</h2><p>Your reference is <strong>#{reference}</strong>. Keep it for your records.</p><p>Your selected time is reserved in the spa calendar. The team will contact you if any treatment-specific information needs attention. {hasConnectedAccount ? "This appointment is linked to your signed-in account. You can see it in your visit history below." : "Your booking is saved. You can find it in My account."}</p><div className="actions" style={{ justifyContent: "center" }}>{hasConnectedAccount ? <Link href="/account#my-visits" className="button buttonPrimary">View my appointment →</Link> : <Link href="/account?submitted=1#my-visits" className="button buttonPrimary">View my appointment history →</Link>}<Link href="/" className="button buttonLight">Back to Village Wellness Spa</Link></div></div> :
      <div className="bookingLayout">
        <form className="formCard bookingForm" onSubmit={handleSubmit}>
          <section className="bookingFormSection"><div className="bookingSectionHeading"><span>01</span><div><h2>Choose your treatment</h2><p>Choose a treatment, or leave it blank and the team can guide you.</p></div></div>
            <div className="field"><label htmlFor="serviceId">Choose a treatment</label><select id="serviceId" name="serviceId" value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">{loadingServices ? "Loading the menu…" : "I’m not sure — help me choose"}</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.price} · {item.duration}</option>)}</select><small>Not sure what to choose? Leave this blank and the team can guide you.</small></div>
            {selected && <div className="selectedTreatment"><div><span className="kicker">Your selection</span><strong>{selected.name}</strong><p>{selected.description}</p></div><div className="selectedTreatmentPrice"><strong>{selected.price}</strong><span>{selected.duration}</span></div>{selected.consultationRequired && <p className="selectedTreatmentNote">Clinical assessment may be required. Suitability is determined by the Village Wellness Spa clinical team.</p>}</div>}
          </section>
          <section className="bookingFormSection"><div className="bookingSectionHeading"><span>02</span><div><h2>When works for you?</h2><p>Choose an available time. Your booking is confirmed as soon as the slot is reserved.</p></div></div>
            <div className="formGrid">
              <div className="field">
                <label htmlFor="date">Appointment date</label>
                <input id="date" name="date" type="date" min={minDate} value={preferredDate} onChange={event => setPreferredDate(event.target.value)} required />
                <small>{selectedHours?.open ? (selectedDay ? dayLabels[selectedDay] : "") + " · Operating hours " + selectedHours.start + "–" + selectedHours.end + ". Times below are checked against the live calendar." : selectedDay ? "The clinic is not accepting bookings on " + dayLabels[selectedDay] + ". " : "Times below are checked against the live calendar."}</small>
                {preferredDate && <SpaWeatherReport selectedDate={preferredDate} />}
              </div>
              <div className="field fieldFull">
                <label>Appointment time</label>
                {!preferredDate ? <p className="slotHint">Choose a date to check available times.</p>
                  : loadingSlots ? <p className="slotHint">Checking the live calendar…</p>
                  : availabilityError ? <div className="slotError" role="alert">
                    <p>{availabilityError}</p>
                    <p>We will not show unverified times as live availability. Your appointment has not been booked.</p>
                    <div className="actions"><button type="button" className="button buttonLight" onClick={() => setAvailabilityRetry(value => value + 1)}>Try checking again</button></div>
                  </div>
                  : availableSlots.length === 0 ? <div className="slotHint">
                    <p>{availabilityNote || "No available times were found for this date. Try another day."}</p>
                    <Link className="textLink" href="/#visit">Contact the spa about another date ↗</Link>
                  </div>
                  : <>
                    <p className="slotHint">Times are checked against the live calendar and rechecked when you submit. {availabilityNote ? " " + availabilityNote : ""}</p>
                    <div className="timeSelectionSummary">
                      <div><strong>{selectedTime || "Choose a time"}</strong><small>{selectedTime ? "Selected appointment time" : `${availableSlots.length} available times`}</small></div>
                      <button type="button" className="button buttonLight" onClick={() => setShowTimePicker(true)} aria-haspopup="dialog">{selectedTime ? "Change time" : "Choose time"}</button>
                    </div>
                    {showTimePicker && <div className="timePickerBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowTimePicker(false); }}>
                      <section className="timePickerDialog" role="dialog" aria-modal="true" aria-labelledby="time-picker-title" tabIndex={-1}>
                        <div className="timePickerHeading">
                          <div><span className="kicker">LIVE AVAILABILITY</span><h3 id="time-picker-title">Choose your time</h3><p>{selectedDay ? dayLabels[selectedDay] : ""} · {selectedHours?.start}–{selectedHours?.end}</p></div>
                          <button type="button" className="timePickerClose" aria-label="Close time selector" onClick={() => setShowTimePicker(false)}>×</button>
                        </div>
                        <div className="slotHourGroups" aria-label="Available appointment times">
                          {slotGroups.map(([hour, times]) => <section className="slotHourGroup" key={hour} aria-labelledby={`slot-hour-${hour}`}>
                            <h4 id={`slot-hour-${hour}`}>{hour}:00 hour</h4>
                            <div className="slotGrid" role="group" aria-label={`Times starting at ${hour}:00`}>
                              {times.map(time => <button key={time} type="button" className={selectedTime === time ? "slotButton selected" : "slotButton"} aria-pressed={selectedTime === time} onClick={() => { setSelectedTime(time); setShowTimePicker(false); }}>{time}</button>)}
                            </div>
                          </section>)}
                        </div>
                        <p className="slotHint">Choose a time to return to your booking. The calendar is checked again when you submit.</p>
                      </section>
                    </div>}
                  </>}
              </div>
              <div className="field">
                <label htmlFor="discountCode">Offer code <span>(optional)</span></label>
                <input id="discountCode" name="discountCode" autoComplete="off" placeholder="Enter a published offer code" />
              </div>
            </div>
          </section>
          <section className="bookingFormSection"><div className="bookingSectionHeading"><span>03</span><div><h2>How can we reach you?</h2><p>{hasSavedProfile ? "We’ll use the contact details already saved to your customer account." : "Enter the contact details for this booking. Saved account details are reused on future visits."}</p></div></div>
            {hasSavedProfile ? <div className="customerPanel">
              <strong>Using your saved customer details</strong>
              <p>{customerName} · {customerPhone}{customerEmail ? " · " + customerEmail : ""}</p>
              <Link href="/account" className="textLink">View your customer account ↗</Link>
              <input type="hidden" name="name" value={customerName}/>
              <input type="hidden" name="phone" value={customerPhone}/>
              <input type="hidden" name="email" value={customerEmail}/>
            </div> : <div className="formGrid">
              <div className="field fieldFull"><label htmlFor="name">Your full name</label><input id="name" name="name" required autoComplete="name" value={customerName} onChange={event=>setCustomerName(event.target.value)} placeholder="e.g. Kopano Gatsha"/></div>
              <div className="field"><label htmlFor="phone">WhatsApp / mobile number</label><input id="phone" name="phone" type="tel" required autoComplete="tel" value={customerPhone} onChange={event=>setCustomerPhone(event.target.value)} placeholder="Best contact number"/></div>
              <div className="field"><label htmlFor="email">Email <span>(optional)</span></label><input id="email" name="email" type="email" autoComplete="email" value={customerEmail} onChange={event=>setCustomerEmail(event.target.value)} placeholder="you@example.com"/></div>
            </div>}
          </section>
          {error && <p className="bookingError" role="alert">{error}</p>}
          <button className="button buttonPrimary bookingSubmit" type="submit" disabled={busy}>{busy ? "Booking…" : "Book appointment"} <span aria-hidden="true">→</span></button>
          <p className="bookingPrivacy">Your details are used to manage this booking. Please do not enter sensitive medical information in this form.</p>          

        </form>
        <div className="bookingTrustNote"><strong>Your appointment is confirmed when the booking is saved.</strong><span>Your selected date and time are reserved. Payment is handled at the spa.</span></div>
      </div>}
    </div>
  </main>;
}
