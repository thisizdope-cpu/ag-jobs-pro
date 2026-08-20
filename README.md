# Ag Jobs Pro v2

React/Vite agriculture and crop-insurance career application with a database-ready Supabase foundation and a built-in snapshot fallback.

## What v2 adds

- Supabase REST data layer without adding another browser dependency
- Automatic snapshot fallback if Supabase is not configured or unavailable
- PostgreSQL jobs schema with row-level security
- 40-job seed migration generated from the original artifact
- Real timestamp fields (`posted_at`, `first_seen_at`, `last_seen_at`, `verified_at`)
- Canonical job key for duplicate prevention
- `raw_hash` for change detection
- Active/expired job lifecycle fields
- Server-only stale-job expiration helper
- Trusted Edge Function scaffold for bulk job upserts
- `.env.example` for Vercel/Netlify/local configuration
- Snapshot data validator

## Current behavior

Without environment variables, the app behaves like v1 and uses `src/data/jobs.json`.

With Supabase configured, the browser reads active jobs from `public.jobs`. If that request fails, the app safely falls back to the local snapshot and displays a warning.

## Local development

Requires Node.js 20+.

```bash
npm install
npm run validate
npm run dev
```

Production check:

```bash
npm run check
npm run preview
```

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run these files in order:
   - `supabase/migrations/001_jobs_schema.sql`
   - `supabase/migrations/002_seed_snapshot.sql`
   - `supabase/migrations/003_lifecycle.sql`
4. Copy `.env.example` to `.env.local`.
5. Add your project URL and **public anon key**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Never place the Supabase service-role key in a `VITE_` environment variable. Anything prefixed with `VITE_` is shipped to the browser.

## Deployment

### Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as project environment variables.

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add the same two environment variables.

## Ingestion foundation

`supabase/functions/upsert-jobs/index.ts` accepts normalized job records from a trusted server-side worker. It requires an `INGEST_SECRET` and uses the Supabase service-role credential only inside the server function.

The browser never gets database write access. Row-level security allows anonymous users to read only active jobs.

A future ingestion worker can:

1. Fetch employer/ATS feeds.
2. Normalize records.
3. POST them to `upsert-jobs`.
4. Refresh `last_seen_at` for jobs that still exist.
5. Call `expire_stale_jobs()` after an appropriate stale period.

## Next development phase

After the Supabase project is connected:

1. Verify the seed data renders from Supabase.
2. Deploy the v2 site.
3. Build source-specific employer/ATS ingestion connectors.
4. Add automated verification and expiry checks.
5. Add user accounts, saved-job sync, alerts, and application tracking.
6. Add crop-insurance taxonomy and match scoring after the data pipeline is reliable.

## Connected backend

This package is already configured for the Ag Jobs Pro Supabase project. The included publishable key is intended for browser use; database writes remain blocked from anonymous/authenticated browser clients by RLS and grants.

Backend status at packaging: **40 active jobs loaded**, public read verified, and Supabase security advisor returned no security lints.
