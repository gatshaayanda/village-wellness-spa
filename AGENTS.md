# Village Wellness Spa — Agent Operating Contract

## Product identity
Village Wellness Spa is a boutique wellness spa and aesthetics clinic at 1900 Dundas Street West, Suite 27, Mississauga, ON L5K 1P9, Canada.

Brand palette: hot pink `#E52B7C`, emerald `#20B273`, chocolate `#6B3C1B`, and white. Use `public/villagespa.jpg` wherever the brand mark or PWA icon appears.

Services include IV nutrient therapy, facials and skincare, microneedling, laser treatments, peels, injectables (Botox/fillers only when provided by certified practitioners), massage, nails, waxing/sugaring, body treatments and curated skincare products. Do not invent pricing, operating hours, contact details, reviews or medical outcomes. Use “Request pricing” where no approved price is available. Clinical suitability is determined by the qualified practitioner/team.

## Implementation contract
- Product owner and final reviewer: user. Technical navigator and implementer: ChatGPT.
- GitHub repository and current code are the source of truth. Inspect before changing; preserve working workflows and avoid unrelated refactors.
- Preserve existing booking requests, customer accounts/history, protected admin access, Firestore data integration, UploadThing media uploads and admin CRUD. Booking requests are not automatically confirmed.
- The user manages Firebase environment/configuration. Do not change Firebase project IDs, credentials, environment files or service-account setup unless explicitly instructed.
- Never commit secrets or local production environment files.
- Preserve the existing PWA installation event lifecycle, user-triggered native install prompt, branded install card, embedded-browser/iOS guidance and service-worker behavior. Change branding, assets, colors, copy and project-specific cache namespaces only unless explicitly authorized.
- Preserve the existing chatbot implementation and behavior; only change branding, wording and Village Wellness Spa relevance unless explicitly authorized otherwise.
- No fabricated clinical claims, pricing, appointment availability, payment gateway, successful sync or appointment confirmation.
- Use mobile-first, accessible responsive design. Keep loading, empty, error and success states for real workflows.
- Verify changed code, run available type/lint/build checks, inspect the final diff and report exactly what was and was not verified. A push is not proof of deployment.

## QA priorities
1. Public home, service catalogue and service detail branding/copy.
2. Guest appointment request and honest received/not-confirmed state.
3. Optional customer account connection and booking history.
4. Admin authorization, appointment review/status changes, calendar and service/product CRUD.
5. Image upload through existing UploadThing integration.
6. PWA install behavior and offline messaging.
7. Mississauga local date/time handling and configured address.
