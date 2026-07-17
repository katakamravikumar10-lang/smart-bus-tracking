import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        // AuthSessionMissingError is the normal "signed-out visitor" state on
        // public routes like /auth — treat it as no user, not an error.
        if (error && error.name !== "AuthSessionMissingError") {
          console.error("[useSession] getUser failed:", error);
        }
        setUser((prev) => {
          const next = data?.user ?? null;
          if (prev?.id === next?.id) return prev;
          return next;
        });
        setLoading(false);
      })
      .catch((err) => {
        if ((err as { name?: string })?.name !== "AuthSessionMissingError") {
          console.error("[useSession] getUser threw:", err);
        }
        setUser(null);
        setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore noisy events that don't represent identity changes.
      // TOKEN_REFRESHED fires ~hourly and on tab focus; INITIAL_SESSION fires on every mount.
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      ) {
        return;
      }
      const next = session?.user ?? null;
      setUser((prev) => {
        // Skip state update when identity hasn't changed (prevents re-render storm).
        if (prev?.id === next?.id && event !== "USER_UPDATED") return prev;
        return next;
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

export function useRole(user: User | null) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if (!active) return;
        if (error) console.error("[useRole] fetch failed:", error);
        setRole((data?.role as AppRole) ?? null);
      } catch (err) {
        if (!active) return;
        console.error("[useRole] threw:", err);
        setRole(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);
  return { role, loading };
}

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (!active) return;
        if (error) console.error("[useProfile] fetch failed:", error);
        setProfile(data ?? null);
      } catch (err) {
        if (!active) return;
        console.error("[useProfile] threw:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);
  return profile;
}