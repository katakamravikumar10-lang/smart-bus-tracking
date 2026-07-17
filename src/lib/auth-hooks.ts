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
        if (error) console.error("[useSession] getUser failed:", error);
        setUser(data?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useSession] getUser threw:", err);
        setUser(null);
        setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

export function useRole(user: User | null) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[useRole] fetch failed:", error);
        setRole((data?.role as AppRole) ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useRole] threw:", err);
        setRole(null);
        setLoading(false);
      });
  }, [user]);
  return { role, loading };
}

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[useProfile] fetch failed:", error);
        setProfile(data ?? null);
      })
      .catch((err) => console.error("[useProfile] threw:", err));
  }, [user]);
  return profile;
}