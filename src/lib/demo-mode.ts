/**
 * Demo Mode gating for production hardening.
 *
 * Demo Mode is only available when:
 *   1. The build is a development build (`import.meta.env.DEV`), OR
 *   2. `VITE_ENABLE_DEMO_MODE=true` is set at build time.
 *
 * In production builds without the flag, Demo Mode UI is never rendered,
 * the Settings toggle is hidden, and demo credentials are absent from the
 * client bundle.
 */
export function isDemoModeAllowed(): boolean {
  try {
    if (import.meta.env.DEV) return true;
    return import.meta.env.VITE_ENABLE_DEMO_MODE === "true";
  } catch {
    return false;
  }
}