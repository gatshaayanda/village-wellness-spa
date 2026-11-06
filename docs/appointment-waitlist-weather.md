# Appointment waitlist and Gaborone weather report

## Industry and competitor notes

Fresha's official documentation supports online waitlist entry, client-selected time preferences, manual or automatic handling, prioritisation rules and customer updates when openings appear. Its scheduling tools also account for staff shifts and bookable resources/rooms. Mindbody's spa scheduling guidance similarly describes matching a waitlisted service to a real opening and contacting a qualified customer.

This implementation deliberately starts with **manual staff review**, not automatic slot matching: the current Village Wellness Spa app does not yet have a complete practitioner/room resource calendar or a tested priority and offer-expiry engine. It therefore records the customer's request, exposes it to staff, and lets the team contact the customer. Do not claim automatic queue order, live slot matching, guaranteed notifications or automatic booking until those systems are implemented and verified.

References:
- Fresha waitlist setup and online requests: https://www.fresha.com/help-center/knowledge-base/calendar/259-set-up-and-manage-your-waitlist
- Fresha waitlist updates: https://www.fresha.com/help-center/knowledge-base/calendar/169-send-waitlist-updates
- Fresha staff and bookable-resource scheduling: https://www.fresha.com/for-business/features/scheduling
- Mindbody spa scheduling and waitlist management: https://www.mindbodyonline.com/en-gb/business/education/blog/booking-and-scheduling-software-spas

## Customer journey

The homepage keeps **Book an appointment** as the primary action and adds **Join the waitlist** as a secondary route. The waitlist reuses the existing booking form presentation but submits to a separate server endpoint.

A waitlist request:
- can be submitted as a guest; a verified Firebase customer UID is attached when the existing anonymous/customer session is available
- optionally records a preferred treatment, date and time; blank timing means flexible
- is stored in the existing `bookingRequests` collection with `requestType: "WAITLIST"` and status `NEW`
- does not reserve a slot, promise an opening, create a queue position or collect payment
- appears in Admin → Requests → Waitlist and in the submitting customer's private My Visits history when the request is linked to their verified UID

Staff review the request, verify the practitioner, room and duration requirements, then contact the customer with a specific available slot. The customer submits the ordinary appointment request to reserve it. The admin API and controls prevent a waitlist request from being marked as payment pending, confirmed, arrived or completed.

## Weather report

The homepage shows current Gaborone conditions and a three-day outlook. The booking/waitlist form shows the selected date's forecast when that date is within the available forecast range.

Provider: WeatherAPI.com
- API endpoint is called only from `/api/weather`; the API key stays server-side.
- Configure `WEATHERAPI_KEY` in local environment and Vercel server environment.
- The current integration uses the free tier (three-day forecast; commercial use allowed) and attributes WeatherAPI.com.
- Responses are cached for 30 minutes, below the provider's maximum current-condition caching window.
- The UI includes a disclaimer that weather information is general and forecasts may be inaccurate; it must not be relied on for personal safety or emergencies. Weather does not determine treatment suitability or appointment availability.
- Without a key or if the provider is unavailable, the weather area displays a non-blocking explanation; booking and waitlist remain usable.

References:
- https://www.weatherapi.com/pricing
- https://www.weatherapi.com/terms
- https://www.weatherapi.com/docs/
- https://www.fresha.com/lp/en/bw-gaborone-gaborone
- https://www.mindbodyonline.com/business/education/blog/booking-and-scheduling-software-spas

## QA checklist

1. From the homepage, choose Book an appointment and verify the existing three-stage, live-availability booking still works.
2. From the homepage, choose Join the waitlist. Submit a guest request with a preferred treatment and flexible date/time; verify the server returns a reference.
3. Submit a second waitlist request with a preferred date/time. Verify no slot reservation is created.
4. In Admin → Requests → Waitlist, find both requests, review the treatment/timing, use WhatsApp/Call, and update to REVIEWING or NEEDS_CONTACT.
5. Verify staff cannot mark a waitlist request as payment pending, confirmed, arrived or completed.
6. Sign into the same customer profile and verify the waitlist entry appears in My Visits with its reference and a clear “not reserved” explanation.
7. Verify a different customer cannot see the waitlist entry.
8. Configure `WEATHERAPI_KEY` and verify current conditions, the three-day homepage outlook and a selected visit-date report. Remove the key and verify booking/waitlist remain available with a graceful weather message.
9. Check responsive layout on phone and desktop. Confirm PWA installation and chatbot behavior remain unchanged.
