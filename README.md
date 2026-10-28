# Kitho

Free dating website. One profile per person, no paywalls, no algorithms.

**Stack:** React + TypeScript + Vite + React Router · Supabase (Postgres, Auth, Storage, Edge Functions) · Render.

## Repo layout

- `web/` — frontend (React app + `server.mjs` static server for Render).
- `supabase/migrations/` — database schema.
- `supabase/functions/` — backend API, one folder per function (`_shared/` holds common helpers).

## Run locally

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

## Deploy (Render web service)

- Root Directory: `web`
- Build: `npm ci && npm run build`
- Start: `npm start` (serves `dist/` via `server.mjs` with SPA fallback)
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Supabase

- Schema: `supabase/migrations/` (profiles, photos, likes, messages + RLS; private `photos` bucket).
- Edge Functions (`supabase/functions/`):
  - `delete-account` — user deletes own account (photos + auth user; rows cascade).
  - `track-visit` — visitor tracker (who, IP location, device, browser).
  - `admin-login` — admin login, returns a 12h admin token.
  - `admin-stats`, `admin-users`, `admin-reports` — admin panel data.
  - `admin-restrict`, `admin-ban`, `admin-delete-user` — admin actions on one user.
  - `admin-report-settings` — read/update report points, thresholds and decay.
  - `track-visit` and `admin-*` deploy with `verify_jwt = false` (see `supabase/config.toml`).
  - Secrets: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`.
- Phone is owner-only (read via `get_my_private()`).
- Personal ID: backend-only 12-digit number generated on profile insert (trigger `assign_personal_id`),
  stored encrypted (`personal_id_enc`, key in Supabase Vault) with a keyed hash for uniqueness/lookup
  (`personal_id_hash`). Never exposed to clients. Admin/service-role only:
  `admin_get_personal_id(profile_id)`, `admin_find_profile_by_personal_id(id)`.

## Admin panel (`/admin`)

Login with the admin credentials (checked server-side). Tabs: Stats (live counters + visitors log),
Users (restrict / ban / delete), Reports (all reports + report system settings).

Report system (`report_reason_points`, `report_settings`):
- Each report reason adds 1–3 points; repeat reports from the same reporter add 0.
- Restricted at 9 points (auto-lifts when points decay below): likes and messages are silently not delivered.
- Banned at 15 points (until unbanned): hidden from everyone and locked out of the app.
- 1 point goes down every 7 days (hourly `pg_cron` job `kitho-points-decay`).

### Auth email template (Dashboard → Authentication → Emails → Confirm signup)

Subject: `Your Kitho verification code`

```html
<h2>Welcome to Kitho</h2>
<p>Your verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>Enter it on the sign-up page to verify your email. If you didn't sign up, ignore this email.</p>
```
