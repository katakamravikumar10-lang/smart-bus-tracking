import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AcademicYearStatus = "upcoming" | "active" | "archived";

export type AcademicYear = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: AcademicYearStatus;
  locked: boolean;
  promotions_enabled: boolean;
  created_at: string;
  updated_at: string;
};

const TABLE = "academic_years";

export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(TABLE as any) as any)
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AcademicYear[];
}

export async function fetchActiveAcademicYear(): Promise<AcademicYear | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(TABLE as any) as any)
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return (data as AcademicYear | null) ?? null;
}

export function useAcademicYears() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setYears(await fetchAcademicYears());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = years.find((y) => y.status === "active") ?? null;
  return { years, active, loading, refresh };
}