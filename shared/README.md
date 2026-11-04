# shared

Platform-agnostic Kitho logic used by `web/` and `mobile/` (Supabase queries, types, profile/DOB helpers).
No install of its own: imported via the `@kitho/shared` alias; `@supabase/supabase-js` is type-only and
resolved from each app's `node_modules`. Each app calls `initShared({ client, uuid })` once at startup.
Admin code stays in `web/` only.
