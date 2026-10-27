# Tripple S Wellness Spa

Tripple S Wellness Spa is a mobile-first digital front desk and client-care application for a medical aesthetics, skin health and wellness clinic in Gaborone, Botswana.

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

## Important boundary

This is not a diagnostic or medical-advice system. Clinical suitability remains with the Tripple S clinical team.

This repository is the Village Wellness Spa product. Keep branding, business details and integrations specific to Village Wellness Spa.

## Village Wellness Spa identity

- Address: 1900 Dundas Street West, Suite 27, Mississauga, ON L5K 1P9, Canada.
- Brand palette: hot pink `#E52B7C`, emerald `#20B273`, chocolate `#6B3C1B`, white.
- Use `public/villagespa.jpg` for the public brand and PWA/Apple web-app icons.
- Preserve existing booking, account, admin, Firebase/Firestore and UploadThing workflows while adapting business copy and catalogue content.
- Keep PWA installation and service-worker behavior intact; change branding and project-specific cache namespace only unless explicitly authorized.
