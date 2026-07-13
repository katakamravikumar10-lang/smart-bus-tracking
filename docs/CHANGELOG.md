# Changelog

Format follows Keep a Changelog.

## [1.0.0] — 2026-07-13 — Production Release
### Added
- Multi-role platform: Admin, Driver, Faculty, Student.
- Admin Dashboard: KPIs, Buses, Routes, Drivers, Students, Faculty, Announcements, Analytics, Audit, Reports, Settings.
- Demo Mode gated behind admin-only Development Settings.
- Complete audit logging with IP + user agent.
- Reliability: global error boundary, offline banner, exponential-backoff retry.
- GPS: accuracy indicator, deviation, idle detection, reconnect, battery optimization, speed, ETA, traffic, route replay, multi-bus, geofencing, arrival/departure.
- Google Maps with OpenStreetMap fallback.
- Analytics + full exports (CSV, Excel, PDF, Print).
- Pagination + global search everywhere.
- Login lockout, HIBP password check, admin session timeout.
- Full documentation set.

### Security
- RLS on all public tables.
- Roles in dedicated `user_roles` table via `has_role()`.
- Self-signup limited to student/faculty.

### Performance
- Lazy-loaded heavy routes.
- Optimized realtime subscriptions.
- Memoized components.

## [0.9.0] — 2026-07
GPS + analytics upgrade.

## [0.5.0] — 2026-06
Demo Mode separation, audit groundwork.

## [0.1.0] — 2026-05
Initial scaffold.