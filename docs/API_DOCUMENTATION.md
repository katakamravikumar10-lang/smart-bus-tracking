# API Documentation

## Surfaces
1. **TanStack Server Functions** (`createServerFn`) — typed RPC used by the client.
2. **Public HTTP routes** in `src/routes/api/public/*` — webhooks, cron, health.

All data access goes through Supabase (Lovable Cloud) with RLS.

## Authentication
Client uses Supabase publishable key + user JWT. Protected server functions use `requireSupabaseAuth`.

## Server Function — `logAdminAction`
Path: `src/lib/security.functions.ts`
```ts
input: {
  action: string;         // e.g. "bus.create"
  entity_type: string;
  entity_id?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}
```
Requires admin role. Writes to `public.audit_logs` with actor id, IP, user agent, timestamp.

## Public Routes
### `GET /api/public/health`
Returns `{ ok: true, time }`.

### `POST /api/public/webhook/*`
Verify HMAC signature (`x-webhook-signature`) using `WEBHOOK_SECRET` before processing.

## Tables (public schema)
| Table | Purpose |
|---|---|
| profiles | User profiles. |
| user_roles | Role assignments. |
| buses | Fleet. |
| routes | Routes + stops. |
| drivers | Driver metadata. |
| assignments | Driver ↔ bus ↔ route. |
| trips | Trip records. |
| locations | GPS points. |
| announcements | Broadcasts. |
| audit_logs | Admin action log. |
| login_attempts | Lockout tracking. |
| app_settings | Demo Mode + toggles. |

All tables have RLS enabled with explicit GRANTs.

## Errors
Server functions throw `Response` with 4xx/5xx and JSON `{ error, code, details? }`.

## Rate Limits
Login: 5 failed / 15 min per email → lockout.

## Realtime
`locations` and `trips` streamed via Supabase Realtime. Client debounces and cleans up on unmount.