# Deployment Guide

**Project:** Smart Bus Tracking System
**Institution:** Narayana Engineering College
**Stack:** TanStack Start (React 19) + Vite 7 + Supabase (Lovable Cloud) + Google Maps

## 1. Prerequisites
- Node 20+ and Bun 1.1+
- GitHub account with repo access
- Vercel account
- Supabase project (Lovable Cloud managed)
- Google Maps Platform project + billing enabled

## 2. Environment Variables
Configured in **Vercel → Project → Settings → Environment Variables** for `Production` and `Preview`.

| Name | Scope | Source |
|---|---|---|
| `VITE_SUPABASE_URL` | client | Lovable Cloud |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Lovable Cloud |
| `VITE_SUPABASE_PROJECT_ID` | client | Lovable Cloud |
| `SUPABASE_URL` | server | Lovable Cloud |
| `SUPABASE_PUBLISHABLE_KEY` | server | Lovable Cloud |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Lovable Cloud |
| `SUPABASE_DB_URL` | server (migrations) | Lovable Cloud |
| `LOVABLE_API_KEY` | server | Lovable |
| `GOOGLE_MAPS_API_KEY` | server | Google Cloud Console |
| `GOOGLE_MAPS_BROWSER_KEY` | client | Google Cloud Console (HTTP referrer restricted) |
| `GOOGLE_MAPS_TRACKING_ID` | analytics | Google |
| `VITE_ENABLE_DEMO_MODE` | client (build) | Set to `false` for production. When unset or `false`, Demo Mode UI, demo credentials, and the GPS simulator are excluded from the production bundle. Set to `true` only for staging demos. |

> Restrict the browser key to deployed domain(s). Restrict the server key by IP where possible. Never commit keys.

## 3. GitHub Setup
1. Push repo to `github.com/narayanaengg/smart-bus-tracking`.
2. Protect `main`; require PR review.
3. Enable Dependabot security updates.

## 4. Vercel Setup
1. **Import Project** → select the GitHub repo.
2. Framework preset: **Vite** (works with TanStack Start).
3. Build command: `bun run build`.
4. Install command: `bun install`.
5. Add environment variables (Section 2).
6. Assign custom domain: `bus.narayanaengg.edu.in`.
7. Deploy.

## 5. Supabase (Lovable Cloud)
- Migrations in `supabase/migrations/` apply automatically.
- RLS policies enforced on every public table.
- Auth providers enabled: Email + Password, Google.
- Leaked-password protection: ON.
- Storage buckets: `avatars` (private).
- Backups: managed by Lovable Cloud; export via Cloud → Advanced → Export data.

## 6. Google Maps
1. Enable APIs: Maps JavaScript, Places, Directions, Geocoding.
2. Create two keys: browser (HTTP referrer restricted) and server (IP restricted).
3. Set daily quota.
4. Verify billing is active.

## 7. First Deploy Checklist
- [ ] Env vars set in Vercel (Prod + Preview).
- [ ] Custom domain DNS records configured.
- [ ] Demo Mode disabled in Settings → Development.
- [ ] `VITE_ENABLE_DEMO_MODE=false` (or unset) in Vercel Production env.
- [ ] Driver accounts are administrator-created only; public signup exposes Student and Faculty only.
- [ ] Admin account created and verified.
- [ ] Buses, routes, drivers seeded.
- [ ] Google Maps loads on production URL.
- [ ] Test student, faculty, driver sign-ups.
- [ ] Test SOS + audit log.

## 8. Rollback
- Vercel: previous deployment → Promote to Production.
- Database: restore from Lovable Cloud export (see Maintenance Guide).

## 9. Post-Deploy Verification
- Run Lighthouse audit on production URL.
- Confirm zero console errors on `/`, `/auth`, `/dashboard`.
- Confirm audit log records a test admin mutation.