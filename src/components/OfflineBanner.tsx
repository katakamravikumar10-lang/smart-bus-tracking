import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * Fixed-position banner that appears when the browser goes offline.
 * Auto-hides on reconnect and shows a brief "Back online" confirmation.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [justRecovered, setJustRecovered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      setOnline(true);
      setJustRecovered(true);
      window.setTimeout(() => setJustRecovered(false), 2500);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && !justRecovered) return null;

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