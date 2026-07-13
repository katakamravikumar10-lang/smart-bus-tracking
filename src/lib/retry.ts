/**
 * Retry an async operation with exponential backoff.
 * Intended for transient network / DB failures on user-visible actions.
 *
 * Defaults: 3 attempts, base 400ms, factor 2, jitter ±25%. Retries only when
 * `shouldRetry` returns true (default: any thrown error, and Supabase-style
 * results with an `.error` object that looks network-y).
 */
export type RetryOptions = {
  attempts?: number;
  baseMs?: number;
  factor?: number;
  jitter?: number;
  shouldRetry?: (err: unknown, attempt: number) => boolean;
};

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 400;
  const factor = opts.factor ?? 2;
  const jitter = opts.jitter ?? 0.25;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !shouldRetry(err, i)) throw err;
      const delay = baseMs * Math.pow(factor, i);
      const j = 1 + (Math.random() * 2 - 1) * jitter;
      await new Promise((r) => setTimeout(r, Math.round(delay * j)));
    }
  }
  throw lastErr;
}

function defaultShouldRetry(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  // Retry on classic transient conditions.
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("temporarily") ||
    msg.includes("econnreset") ||
    msg.includes("fetch") ||
    msg.includes("load failed")
  );
}