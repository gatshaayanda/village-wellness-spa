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
