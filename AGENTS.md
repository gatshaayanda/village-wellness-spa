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
- Keep customer account screens compact and task-led: visit history/status first, account security and update preferences next, optional active offers last. Do not add unrelated wellness games, journals or long editorial sections to the account.
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
