import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resolve a stored avatar path or URL to a displayable URL. */
export function useAvatarUrl(pathOrUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(pathOrUrl)) {
      setUrl(pathOrUrl);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(pathOrUrl, 60 * 60 * 24 * 30)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [pathOrUrl]);
  return url;
}

export function avatarInitials(name: string | null | undefined, fallback = "U") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}