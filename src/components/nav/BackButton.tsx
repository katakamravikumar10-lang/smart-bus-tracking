import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  /** Route to navigate to when there is no browser history to pop. */
  fallbackTo?: string;
  className?: string;
  label?: string;
};

/**
 * Universal back-navigation button.
 * - Uses router history when available so filters/scroll are preserved.
 * - Falls back to `fallbackTo` (default: `/dashboard`) when history is empty
 *   (deep-linked or refreshed page) so we never navigate to a blank state.
 * - Keyboard-activatable via native <button>; visible focus ring.
 */
export function BackButton({ fallbackTo = "/dashboard", className, label = "Back" }: BackButtonProps) {
  const router = useRouter();

  function goBack() {
    const canGoBack =
      typeof router.history.canGoBack === "function"
        ? router.history.canGoBack()
        : typeof window !== "undefined" && window.history.length > 1;

    if (canGoBack) {
      router.history.back();
    } else {
      router.navigate({ to: fallbackTo });
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={goBack}
      aria-label="Go back"
      className={cn(
        "group -ml-2 h-9 gap-1.5 px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:min-h-11",
        className,
      )}
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
      <span className="text-sm font-medium">{label}</span>
    </Button>
  );
}