import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-hooks";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * When the current user is an admin, sign them out after 30 minutes of
 * inactivity. No-op for other roles.
 */
export function useAdminSessionTimeout(role: AppRole | null) {
  const navigate = useNavigate();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (role !== "admin") return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          toast.info("Signed out after 30 minutes of inactivity.");
          navigate({ to: "/auth", replace: true });
        }
      }, IDLE_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [role, navigate]);
}