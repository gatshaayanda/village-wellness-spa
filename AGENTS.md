# Village Wellness Spa — Agent Operating Contract

## Product identity
Village Wellness Spa is a boutique wellness spa and aesthetics clinic in The Village, Gaborone, Botswana. A public business listing identifies Maratadiba Road, Plot 492; confirm the precise address and current contact details with the owner before final launch.

Brand palette: hot pink `#E52B7C`, emerald `#20B273`, chocolate `#6B3C1B`, and white. Use the bundled `public/icon.svg` brand mark for customer-facing branding, metadata and PWA icons.

Core focus: facials and skincare, microneedling, chemical peels, massage and professional skincare products. Additional services must be confirmed with the owner before publication. The initial catalogue uses the price ranges supplied by the business owner: Facials & Skincare P350–P750; Advanced Aesthetic Treatments P800–P1,300; Massage & Body Treatments P450–P700; Express Body Care P300–P500; Nails & Grooming P60–P450. These are the spa's supplied catalogue prices, not market estimates. Display them as prices without estimate/disclaimer labels. Admin must be able to edit, replace, hide, restore and add every catalogue item; customer-facing pages must reflect saved admin changes. Do not invent additional exact prices, operating hours, contact details, reviews or medical outcomes. Clinical suitability is determined by the qualified practitioner/team.

## Implementation contract
- Product owner and final reviewer: user. Technical navigator and implementer: ChatGPT.
- GitHub repository and current code are the source of truth. Inspect before changing; preserve working workflows and avoid unrelated refactors.
- Preserve the customer booking flow, customer account/history, server-side admin access, Firestore persistence, UploadThing media uploads and admin CRUD.
- Customer flow is guest-first: treatment → date/live availability → customer details → saved request/reference → optional account security → private visit history. A request is not a confirmed appointment until staff updates its status.
- Customer accounts use Firebase Anonymous Auth for guest continuity and optional Google linking. Never silently merge separate customer identities. Appointment history and profile data must be scoped to the verified Firebase UID.
- Keep customer account screens compact and task-led: visit history/status first, account security and update preferences next, optional active offers and the requested Garden game as secondary engagement. The Garden game is implemented at `/garden`: a small, phone-friendly, optional plant/water/flower game with a local-device personal best. It requires no login, account data, paid visit or purchase. Keep it separate from reception/treatment operations and do not connect its score to business/customer records.
- Admin access uses the existing single access-word/password login at `/admin`, validated server-side through `ADMIN_PASSWORD`; keep the secret server-only. Do not hard-code the access word or expose it through a public environment variable.
- The user manages Firebase environment/configuration. Do not change Firebase project IDs, credentials, environment files or service-account setup unless explicitly instructed.
- Never commit secrets or local production environment files.
- Preserve the existing PWA installation event lifecycle, user-triggered native install prompt, branded install card, embedded-browser/iOS guidance and service-worker behavior. Change branding, assets, colors, copy and project-specific cache namespaces only unless explicitly authorized.
- Preserve the existing chatbot implementation and behavior; only change branding, wording and Village Wellness Spa relevance unless explicitly authorized otherwise.
- No fabricated clinical claims, appointment availability, payment gateway, successful sync or appointment confirmation.
- Use mobile-first, accessible responsive design. Keep loading, empty, error and success states for real workflows.
- Verify changed code, run available type/lint/build checks, inspect the final diff and report exactly what was and was not verified. A push is not proof of deployment.

## QA priorities
1. Public home, service catalogue and service detail branding/copy.
2. Guest appointment request, live availability recheck and honest received/not-confirmed state.
3. Customer account: booking history, optional Google linking, account collision handling and notification preferences.
4. Admin one-word access, appointment review/status changes, calendar and service/product CRUD.
5. Image upload through existing UploadThing integration.
6. PWA install behavior and offline messaging.
7. Gaborone local date/time handling and configured address.

## Operational transparency and behavioral-science standard
- Apply operational transparency across booking, customer accounts, staff request handling, notifications and receipts: show genuine actions, persisted outcomes, current ownership/next steps and meaningful timestamps where the underlying system records them.
- Do not add artificial waiting, fake progress bars, simulated staff activity, invented status history, false availability, or success messages before the server confirms persistence.
- Keep appointment status separate from payment status. A request is not confirmed until staff sets CONFIRMED; a payment is not received until the payment record is explicitly PAID/verified. Never infer one from the other.
- For every customer-visible status, explain in plain language what has happened and the next useful action. Use neutral, non-judgmental, informational feedback; avoid urgency, pressure, shame or manipulative scarcity.
- Keep notification choices explicit and separate. Saving preferences is not proof that push delivery is configured or that the operating system displayed a notification.
- Keep transparency concise and progressive: show the useful summary first, with additional detail only where it helps a customer or staff member make the next decision.
- Preserve guest-first booking, account identity boundaries, saved booking references, existing admin workflows, Firestore records, UploadThing, PWA installation and chatbot behavior.
- When adding status timestamps, write them only on actual server-side status changes. Legacy records without a timestamp must remain valid and must not be assigned fabricated historical dates.
- QA real persisted transitions from NEW through review/confirmation/completion, and verify that payment status remains independent.

Research grounding (design guidance, not a claim that any single study guarantees conversion):
- Wang, Wu & Wang (2025), *Illuminating the unseen: How and why operational transparency mitigates customer dissatisfaction in platform-based services*, Journal of Business Research, DOI: https://doi.org/10.1016/j.jbusres.2025.115574
- Conrad, Couper, Tourangeau & Peytchev (2010), *The impact of progress indicators on task completion*, Interacting with Computers, DOI: https://doi.org/10.1016/j.intcom.2010.03.001
- *Wellbeing Supportive Design – Research-Based Guidelines for Supporting Psychological Wellbeing in User Experience* (2022), DOI: https://doi.org/10.1080/10447318.2022.2089812

## Reception walk-ins and repeat-visit loop
- Customers book appointments through the existing booking flow. Do not offer remote “on the way” check-ins or customer-created same-day queue entries. The public `/queue` path redirects to appointment booking; the old customer queue API is removed.
- Reception alone registers a walk-in after the customer is physically at the spa. Staff captures the minimum needed to identify the visit (name, WhatsApp/mobile number and treatment); the customer completes no reception form. Record the visit as `requestType: "QUEUE"`, `queueMode: "STAFF"`, status `ARRIVED` in the existing `bookingRequests` collection.
- Staff owns only two visit actions: `ARRIVED → COMPLETED`. A walk-in is recorded as ARRIVED when physically present; a confirmed appointment can be marked ARRIVED on arrival. Staff marks COMPLETED once treatment is finished and payment has actually been received. Do not expose WAITING or IN_TREATMENT steps, queue positions, countdowns or treatment start estimates.
- At registration, reuse an existing customer profile only when the normalized WhatsApp number uniquely identifies it (and, if a name is supplied, the name also matches). Otherwise create a high-entropy, expiring, single-use account-claim link. Reception may prepare the WhatsApp welcome link; the customer can optionally claim the visit and secure their account. Never auto-merge identities by phone alone.
- Staff confirms completion only after treatment and payment. The completion action records the actual amount received in one required BWP amount field; payment method is not required for this simple visit flow. The amount appears in the customer's private account and owner financial analytics. Optional practitioner-approved suggested return date/care note remains separate from the two-step visit status.
- The customer account provides a direct path to book the suggested next visit. Return dates are practitioner/team-entered guidance, not automatically inferred clinical intervals.
- Keep customer-facing notification preferences explicit. The customer account should support opt-in promotions and an optional Garden game as separate engagement features, never prerequisites for a visit. Do not claim push delivery unless configured and verified.
- Keep the experience calm, discreet and service-led for The Village, Gaborone. Do not import G-West car-wash slang, racing/reward mechanics or high-energy queue styling.

Research grounding:
- Hwang, Lee & Legendre (2024), *Operational Transparency as a Service Design: An Investigation on Labor/Effort Observation Effect*, Journal of Hospitality & Tourism Research, DOI: https://doi.org/10.1177/10963480231223146
- Buell & Norton (2011), *The Labor Illusion: How Operational Transparency Increases Perceived Value*, Management Science, DOI: https://doi.org/10.1287/mnsc.1110.1376
- Buell, Kim & Tsay (2016), *Creating Reciprocal Value Through Operational Transparency*, Management Science, DOI: https://doi.org/10.1287/mnsc.2015.2411
- Current Gaborone service context reviewed: Ms Jay Beauty Care booking journey and Mosha Wellness Spa positioning. Use these as market context, not as templates to copy.

## Appointment booking, reception walk-ins and weather report
- There is no customer-facing appointment waitlist. Do not add a waitlist button, page, booking mode, API, admin filter or customer waitlist request. Existing legacy WAITLIST records are historical only and must not enter the active workflow.
- Customers use the normal /book flow when they want a future appointment: choose a treatment and available date/time. Do not ask whether someone is new or returning; the server determines returning status from saved completed-visit history. Saved account contact details are prefilled so customers do not re-enter them unnecessarily. A walk-in does not have to use this booking flow.
- Reception alone registers a walk-in after the customer is physically at the spa. Staff records the customer name, WhatsApp/mobile number and treatment in Admin → Walk-ins & visits; the customer does not fill out a check-in form. Do not offer remote check-in or customer-created queue entries.
- Staff controls only ARRIVED and COMPLETED for real visits. No WAITING or IN_TREATMENT statuses, queue positions, countdowns or treatment start estimates.
- At reception registration, match a returning customer when the normalized mobile number uniquely identifies one existing profile; staff can leave the name blank for this one-field lookup. If the number is ambiguous, staff enters the name to identify the exact profile. Otherwise create a high-entropy, expiring, single-use account-claim link so a first-time customer can connect their visit without filling in another form. Never auto-merge identities by phone alone.
- Staff confirms completion after treatment and payment. Record the actual amount received in the single amount field; only then set payment status to PAID. Payment method is not required. Save optional practitioner-approved return date/care note for the customer account.
- Weather is a planning aid only. Never infer treatment suitability, medical outcomes, staff availability or appointment availability from weather.
- Use the server-only WEATHERAPI_KEY environment variable for WeatherAPI.com. Never expose keys in client code or NEXT_PUBLIC_* variables. The current integration uses the free commercial tier's three-day forecast, attributes WeatherAPI.com, caches responses for 30 minutes and displays a plain-language forecast/safety disclaimer.
- If weather configuration or the provider is unavailable, show a clear non-blocking message; appointment booking must continue to work.
- Preserve the existing booking availability checks and slot-lock transaction.


## Walk-in-first customer and staff workflow — 2026-11-07
- Walk-in customers must not be sent through the online appointment form, asked whether they are first-time/returning, or required to complete a customer-side check-in form. They arrive; reception/staff records the visit; the team provides the treatment; staff marks it completed.
- The staff workflow uses only ARRIVED → COMPLETED for new walk-ins. Legacy WAITING and IN_TREATMENT records may be displayed as ARRIVED and must remain safely completable; do not reintroduce intermediate queue stages.
- Staff may record the customer's name, WhatsApp number and selected treatment on their behalf. Match a returning customer to an existing account only when the saved identity match is exact and unique. A new customer may be offered an optional secure account-claim link; never imply an account was created or linked until verified.
- Customer account value is retention, not a barrier to treatment: preserve visit history, future booking, opt-in promotions/notifications, and preserve the optional no-login Village Garden game as a separate feature with a local-device personal best. Customers should be able to return without re-entering already-saved details where their account is connected.
- Keep online appointment requests available as a separate optional route for customers planning ahead. Do not make online booking a prerequisite for a walk-in.
- Preserve the advanced treatment/category/product CRUD, bulk price editing, catalogue seed reconciliation, saved pricing and public catalogue synchronization. Walk-in changes must not simplify or replace these capabilities.
- Owner analytics must distinguish recorded collections from catalogue prices, requested values or unverified amounts. Keep operational counts, completed visits, walk-in vs appointment split, average paid visit, returning customers, top treatments, daily revenue and completed visits missing a recorded amount visible. Never fabricate a paid amount or claim payment reconciliation that has not been recorded.
- Protect PWA installation, service-worker/offline behavior, Firebase authorization, UploadThing and customer data ownership. Do not alter the install mechanism as part of walk-in work.
