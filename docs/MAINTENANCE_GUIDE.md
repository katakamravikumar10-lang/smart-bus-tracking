# Maintenance Guide

## Routine Tasks
| Frequency | Task |
|---|---|
| Daily | Review audit log for suspicious admin actions. |
| Weekly | Check Vercel build status; review error logs. |
| Weekly | Verify Google Maps quota consumption. |
| Monthly | Export database backup. |
| Monthly | `bun update` on a preview branch; run TS + build. |
| Quarterly | Review RLS policies and roles. |
| Annually | Rotate Supabase + Google Maps keys. |

## Backups
1. Cloud → Advanced settings → Export data.
2. Store archive off-site (encrypted).
3. Test restore quarterly on staging.

## Restore
1. Contact Lovable support with the archive.
2. Update Vercel env vars to point to restored project.
3. Re-verify admin flows.

## Incident Response
Detect → Triage → Contain → Recover → Postmortem (48 h).

## Performance Tuning
- Increase Supabase instance size if needed.
- Pagination is default everywhere.
- Lazy-load heavy pages (Analytics, Audit).
- Optimize images via Vercel Image Optimization.

## Security Maintenance
- Run `bun audit` monthly.
- Review Supabase Linter warnings.
- Confirm leaked-password protection ON.
- Confirm Demo Mode OFF in production.