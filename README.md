# Village Wellness Spa

Village Wellness Spa is a mobile-first digital front desk and client-care application for a medical aesthetics, skin health and wellness clinic in The Village, Gaborone, Botswana.

## Product journey

Customer:
Discover → Understand → Enquire → Book → Confirm → Prepare → Attend → Follow Up → Return

Business:
Enquiry → Review → Appointment → Payment → Arrival → Completion → Follow-up → Repeat

## Stack

Next.js, React, TypeScript, Tailwind CSS, Firebase/Firestore and Vercel.

## Development

npm install
npm run dev

Quality gates:

npx tsc --noEmit
npm run lint
npm run build

Never commit secrets or .env.local.

## Customer journey additions

- The homepage offers the normal appointment request and a separate appointment waitlist. A waitlist entry is a contact request only; it does not reserve a treatment slot or create a queue position.
- Waitlist entries are stored in `bookingRequests` with `requestType: WAITLIST`, visible in Admin → Requests → Waitlist, and shown in the submitting customer's My Visits history when a verified customer session is available.
- Staff must verify practitioner, room and treatment-duration capacity and offer a real available slot before the customer makes a normal appointment request. Waitlist entries cannot be marked confirmed, arrived or completed.
- The Gaborone weather report uses WeatherAPI.com via the server-only `/api/weather` route. Set `WEATHERAPI_KEY` in local/Vercel server environment; never use a `NEXT_PUBLIC_` key. The free plan provides a three-day forecast and permits commercial use with attribution. If the key is absent, the weather area degrades gracefully and booking remains available.

## Important boundary

This is not a diagnostic or medical-advice system. Clinical suitability remains with the Village Wellness Spa clinical team.

This repository is the Village Wellness Spa product. Keep branding, business details and integrations specific to Village Wellness Spa.

## Village Wellness Spa identity

- Address: Maratadiba Road, Plot 492, The Village, Gaborone, Botswana (confirm details with the owner before final launch).
- Brand palette: hot pink `#E52B7C`, emerald `#20B273`, chocolate `#6B3C1B`, white.
- Use `public/villagespa.jpg` for the public brand and PWA/Apple web-app icons.
- Preserve existing booking, account, admin, Firebase/Firestore and UploadThing workflows while adapting business copy and catalogue content.
- Keep PWA installation and service-worker behavior intact; change branding and project-specific cache namespace only unless explicitly authorized.
