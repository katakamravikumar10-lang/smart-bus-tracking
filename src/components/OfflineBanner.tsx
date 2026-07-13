import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * Fixed-position banner that appears when the browser goes offline.
 *
 * Detection strategy:
 *  - Listens to window 'online'/'offline' events as a hint (never sole source of truth —
 *    `navigator.onLine` is unreliable across browsers, VPNs, captive portals, and preview
 *    iframes; some environments report `false` even when connectivity is fine).
 *  - Actively verifies connectivity with a lightweight fetch (HEAD on the app origin +
 *    fallback to a public endpoint) before declaring the app offline.
 *  - Requires two consecutive failed probes to show the banner, preventing false positives
 *    from transient blips, websocket reconnects, or app startup.
 *  - Auto-dismisses once a probe succeeds, with a brief "Back online" confirmation.
 */

const PROBE_TIMEOUT_MS = 4000;
const PROBE_INTERVAL_MS = 20000;
const STARTUP_GRACE_MS = 3000;

async function probeConnectivity(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  const tryFetch = async (url: string) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      // no-cors + cache-busting avoids CORS failures and stale caches; any resolved
      // response (even opaque) means the network reached a server.
      await fetch(url, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  };
  const bust = `?_=${Date.now()}`;
  if (await tryFetch(`${window.location.origin}/favicon.ico${bust}`)) return true;
  // Fallback: a public, tiny, CORS-friendly endpoint.
  if (await tryFetch(`https://www.gstatic.com/generate_204${bust}`)) return true;
  return false;
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [justRecovered, setJustRecovered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let failStreak = 0;
    let intervalId: number | undefined;
    let recoveryTimer: number | undefined;

    const markOnline = () => {
      if (cancelled) return;
      failStreak = 0;
      setOffline((wasOffline) => {
        if (wasOffline) {
          setJustRecovered(true);
          if (recoveryTimer) window.clearTimeout(recoveryTimer);
          recoveryTimer = window.setTimeout(() => setJustRecovered(false), 2500);
        }
        return false;
      });
    };

    const runProbe = async () => {
      const ok = await probeConnectivity();
      if (cancelled) return;
      if (ok) {
        markOnline();
      } else {
        failStreak += 1;
        // Require two consecutive failures before declaring offline.
        if (failStreak >= 2) setOffline(true);
      }
    };

    const onOnline = () => {
      // Re-verify rather than trusting the event blindly.
      void runProbe();
    };
    const onOffline = () => {
      // Hint only — confirm with a probe before showing the banner.
      void runProbe();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Startup grace period: don't probe immediately during app bootstrap.
    const startupTimer = window.setTimeout(() => {
      void runProbe();
      intervalId = window.setInterval(() => void runProbe(), PROBE_INTERVAL_MS);
    }, STARTUP_GRACE_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearTimeout(startupTimer);
      if (intervalId) window.clearInterval(intervalId);
      if (recoveryTimer) window.clearTimeout(recoveryTimer);
    };
  }, []);

  if (!offline && !justRecovered) return null;
  const online = !offline;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-md ${
        online
          ? "bg-emerald-600 text-white"
          : "bg-amber-500 text-white"
      }`}
    >
      {online ? (
        <>
          <RefreshCw className="h-4 w-4" />
          <span>Back online — reconnecting…</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Changes will retry when your connection returns.</span>
        </>
      )}
    </div>
  );
}