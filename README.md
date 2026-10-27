# Kitho

Free dating website. One profile per person, no paywalls, no algorithms.

**Stack:** React + TypeScript + Vite + React Router · Supabase (Postgres, Auth, Storage, Edge Functions) · Render.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

## Deploy (Render web service)

- Build: `npm ci && npm run build`
- Start: `npm start` (serves `dist/` via `server.mjs` with SPA fallback)
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Supabase

- Schema: `supabase/migrations/` (profiles, photos, likes, messages + RLS; private `photos` bucket).
- Edge Function: `supabase/functions/delete-account` (deletes photos + auth user; rows cascade).
- Phone is owner-only (read via `get_my_private()`).
- Personal ID: backend-only 12-digit number generated on profile insert (trigger `assign_personal_id`),
  stored encrypted (`personal_id_enc`, key in Supabase Vault) with a keyed hash for uniqueness/lookup
  (`personal_id_hash`). Never exposed to clients. Admin/service-role only:
  `admin_get_personal_id(profile_id)`, `admin_find_profile_by_personal_id(id)`.

### Auth email template (Dashboard → Authentication → Emails → Confirm signup)

Subject: `Your Kitho verification code`

```html
<h2>Welcome to Kitho</h2>
<p>Your verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>Enter it on the sign-up page to verify your email. If you didn't sign up, ignore this email.</p>
```
