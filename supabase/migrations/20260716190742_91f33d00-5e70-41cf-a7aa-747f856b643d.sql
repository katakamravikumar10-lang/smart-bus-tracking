DROP POLICY IF EXISTS "Admins can delete upcoming years only" ON public.academic_years;
CREATE POLICY "Admins can delete upcoming or archived years"
ON public.academic_years FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND status IN ('upcoming','archived'));