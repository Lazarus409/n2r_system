# n2r_system

N2R System is a centralized tool designed to support the Cybersecurity Authority of Ghana's Cybersecurity Capacity Building and Awareness Centre (CBAC) operations through streamlined information management, workflow coordination, and operational efficiency.

## National Alumni Register

Registration and membership management for the ODASCO Past Students Association (Nananom), built with Next.js, TypeScript and SQLite.

| Page | Who uses it | What it does |
| --- | --- | --- |
| `/register` (also `/`) | Members | Three-step registration form with live validation, a review step and a data-use notice. This is the link you share. |
| `/login` | Alumni office | Password sign-in (12-hour session). |
| `/admin` | Alumni office | Directory with search, filters, sorting, pagination, bulk verify/delete/export and a details panel for viewing, editing and adding notes. Reports with charts, and an activity log of every change. New registrations appear automatically. |

Light, dark and system themes are available on every page.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD
npm run seed                 # optional: 28 fictional sample records (removable from the dashboard)
npm run dev
```

Open <http://localhost:3000/register> and <http://localhost:3000/admin>.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Yes (production) | Admin sign-in password. Changing it signs everyone out. |
| `APP_URL` | Recommended | Public address, e.g. `https://alumni.example.org`, used for link previews. |
| `DATABASE_PATH` | No | Where the SQLite file lives. Default `data/alumni.db`. |

## Deploy

The app needs a server with a **persistent disk** for the database.

### Docker (recommended)

```bash
docker build -t alumni-register .
docker run -d --name alumni -p 3000:3000 \
  -e ADMIN_PASSWORD='a-long-passphrase' -e APP_URL='https://alumni.example.org' \
  -v alumni-data:/app/data --restart unless-stopped alumni-register
```

### Plain Node (VPS)

```bash
npm ci && npm run build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
ADMIN_PASSWORD=... node .next/standalone/server.js
```

Put it behind HTTPS (nginx, Caddy or your host's proxy) and make sure the proxy sets `X-Forwarded-For` so rate limiting sees real client addresses. Vercel and Netlify are not suitable as-is, because their filesystems don't persist.

**Backups:** copy `data/alumni.db` regularly (it is safe to copy while running), or export CSV from the dashboard. Health check: `GET /api/health`.

## Security

- Admin pages and member data require a signed, HttpOnly session cookie (`Secure` in production).
- Sign-in and registration are rate-limited per IP, and failed sign-ins are recorded in the activity log.
- Content-Security-Policy, HSTS, frame blocking and other security headers are set in `next.config.ts`.
- Input is validated on the server, and the same rules are used in the form.
- CSV exports guard against spreadsheet formula injection.
- Member data (`data/`) and secrets (`.env*`) are git-ignored.

## Project layout

- `app/register`, `app/login`, `app/admin`: pages. Admin UI pieces are in `app/admin/_components`.
- `app/api`: `alumni` (list, register, edit, bulk), `audit`, `auth`, `health`
- `lib/db.ts`: SQLite connection and migrations (also imports any old `data/alumni.json` once)
- `lib/store.ts`: data access and the audit log
- `lib/validate.ts`: validation shared by the form, the admin editor and the API
- `lib/constants.ts`: regions, industries, chapters and programmes (edit to change the dropdowns)
- `middleware.ts`: protects admin routes
- `legacy/`: original single-file HTML prototype, kept for reference

Run `npm run typecheck` to check types.
