# n2r_system

N2R System is a centralized tool designed to support the Cybersecurity Authority of Ghana's Cybersecurity Capacity Building and Awareness Centre (CBAC) operations through streamlined information management, workflow coordination, and operational efficiency.

## National Alumni Register

A Next.js app with two parts:

| Page | Who uses it | What it does |
| --- | --- | --- |
| `/register` (also `/`) | Members | Public registration form. This is the link you send out. |
| `/admin` | Alumni office | Password-protected dashboard: directory, verify/delete, CSV export, reports. New registrations appear automatically (checked every 15 seconds). |

Records are saved to `data/alumni.json` on the server. There is no external database or service.

## Run it

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD
npm run seed                 # optional: add 28 fictional sample records
npm run dev
```

Open <http://localhost:3000/register> for the form and <http://localhost:3000/admin> for the dashboard. You'll be sent to `/login`; sign in with the `ADMIN_PASSWORD`. Sessions last 12 hours, and changing the password signs everyone out.

## Going live

Members need to reach the app from their own phones, so it must run on a server with a public address:

```bash
npm run build
npm start          # serves on port 3000
```

- **VPS or any Node host with a persistent disk** (DigitalOcean, Render with a disk, Railway with a volume, a school server): works as-is. Back up `data/alumni.json` regularly.
- **Vercel / Netlify:** their filesystem is read-only and resets, so `data/alumni.json` will not persist. Replace the functions in `lib/store.ts` with a database (e.g. Postgres or SQLite via Turso). Nothing else needs to change.
- Always serve over HTTPS. In production the session cookie is only sent over HTTPS.

## Files

- `app/register/page.tsx`: the member form
- `app/admin/page.tsx`: the dashboard
- `app/api/alumni/`: API (POST is public; GET, PATCH and DELETE need the admin password)
- `app/login/page.tsx`, `app/api/auth/route.ts`, `lib/auth.ts`: admin sign-in (signed session cookie)
- `middleware.ts`: blocks the dashboard and member data unless signed in
- `lib/store.ts`: storage (the JSON file)
- `lib/validate.ts`: validation shared by the form and the API
- `lib/constants.ts`: regions, industries, chapters and programmes. Edit these to change the dropdowns.
- `scripts/seed.ts`: sample-data script (`npm run seed`)
- `legacy/`: the original single-file HTML versions, kept for reference and not part of the app

Everything in the app is TypeScript. Run `npm run typecheck` to check types without building.
