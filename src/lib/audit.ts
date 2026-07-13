import { logAdminAction } from "@/lib/security.functions";

type AuditDetails = Record<string, unknown>;

/**
 * Fire-and-forget audit logger for admin mutations.
 *
 * - Never throws — audit failures must not block user actions.
 * - Captures actor, action, entity, before/after values, and metadata.
 * - Server function fills timestamp, IP, and user-agent automatically.
 *
 * Usage:
 *   audit("bus.create", { entityType: "bus", entityId: id, after: { bus_number } });
 *   audit("bus.update", { entityType: "bus", entityId: id, before, after: patch });
 */
export function audit(
  action: string,
  opts: {
    entityType?: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    details?: AuditDetails;
  } = {},
) {
  const details: AuditDetails = { ...(opts.details ?? {}) };
  if (opts.before !== undefined) details.before = opts.before;
  if (opts.after !== undefined) details.after = opts.after;

  // Only admins can write audit rows (server enforces). For non-admin callers
  // the server returns Forbidden — we swallow it silently.
  void logAdminAction({
    data: {
      action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      details: Object.keys(details).length ? details : undefined,
    },
  }).catch(() => {
    /* audit is best-effort; never surface to the user */
  });
}