# Customer account and booking handoff

## Customer journey
- Appointment requests remain guest-first: treatment selection, date/live availability, customer details, then a saved request reference.
- Firebase Anonymous Auth links a guest request to a browser-persistent customer identity when configured. Authentication failure must never block guest booking.
- The post-submit screen links to `/account?submitted=1`. The customer can see their private request history and optionally connect Google to preserve access across devices.
- Google linking preserves the current anonymous UID. If a Google credential belongs to another UID, offer explicit sign-in to that existing account; never silently merge histories.
- Only verified UID-owned records are returned by customer APIs. Staff status updates remain the source of appointment status.
- Customer account hierarchy is deliberately compact: visit history first; account security and notification preferences next; currently published offers only when available.
- A request is not a confirmation. Only a staff-updated status can mark an appointment confirmed.

## Firebase Auth prerequisites
Enable Anonymous and Google providers in Firebase Console → Authentication → Sign-in method. Add the deployed Village Wellness Spa domain(s) to Authorized domains. The booking form remains guest-first if Anonymous Auth is unavailable, but cross-device account security and saved visit history cannot be verified until the providers and domain are configured.

## Push prerequisites
Push notifications are optional. Before enabling them in a deployment:
1. Configure `NEXT_PUBLIC_FIREBASE_VAPID_KEY` with the public Web Push certificate key from Firebase Console → Project settings → Cloud Messaging.
2. Verify the Firebase web app and server-side `FIREBASE_ADMIN_KEY` belong to the same Village Wellness Spa Firebase project.
3. Test on a supported HTTPS browser/device. Permission granted, token registered, server send accepted, and notification visibly received are separate acceptance checks.
4. Do not treat a successful server response as proof that the operating system displayed the notification.

Notification preferences and device tokens are accessed through authenticated server routes and scoped to the verified Firebase UID. The service worker must not cache private account pages or API responses.

## Acceptance checklist
- [ ] Guest booking succeeds if optional Firebase Auth cannot initialize.
- [ ] A request made with a verified Firebase identity appears only in that identity's private account history.
- [ ] Google linking preserves the current UID; an existing-account collision is handled explicitly.
- [ ] Account history shows staff-updated status and never implies a request is confirmed prematurely.
- [ ] Only currently active clinic-published offers are shown, in Botswana pula.
- [ ] Notification preferences save through authenticated server routes; actual device receipt is verified separately.
- [ ] Private account/API pages and responses are not cached by the service worker.


## Reception walk-in onboarding — 2026-11-07

- A customer who physically arrives at the spa does not complete a public check-in or booking form. Reception records the minimum visit details in Admin → Walk-ins & visits: customer name, WhatsApp/mobile number and treatment.
- The visit is created in the existing `bookingRequests` collection with `requestType: "QUEUE"`, `queueMode: "STAFF"` and `status: "ARRIVED"`. Staff has only two operational actions: Arrived and Completed. New walk-ins do not move through WAITING or IN_TREATMENT.
- Reception matches an existing customer profile only when the saved name and mobile number uniquely match. Otherwise, the server creates a high-entropy, expiring, single-use claim link. The customer can open it and claim the visit in their existing guest/Google account; no customer form is required at reception.
- A customer can complete their visit without creating an account. Account linking is optional and exists to preserve their visit history and make future bookings easier.
- The booking form does not ask customers to declare themselves first-time or returning. The server derives that distinction from saved completed-visit history. Saved account contact details are prefilled for future bookings where the customer has a connected/recognized session.
- On completion, the workflow records that payment was received, per the spa's operating rule. The actual amount is optional in the reception action; owner revenue analytics include only completed visits with a valid saved amount. Completed visits without an amount remain visible as missing financial detail, not fabricated revenue.
- Promotions and any Garden game are optional account engagement features, separate from arrival, treatment and completion. Do not make account sign-in, marketing consent or gameplay a condition of service.
