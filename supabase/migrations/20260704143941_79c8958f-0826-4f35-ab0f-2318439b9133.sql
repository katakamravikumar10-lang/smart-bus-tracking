
-- 1. bus_locations UPDATE: add assignment check to WITH CHECK
DROP POLICY IF EXISTS "Driver updates own bus location" ON public.bus_locations;
CREATE POLICY "Driver updates own bus location"
ON public.bus_locations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.driver_assignments da
    WHERE da.driver_id = auth.uid() AND da.bus_id = bus_locations.bus_id AND da.active
  )
)
WITH CHECK (
  auth.uid() = driver_id
  AND EXISTS (
    SELECT 1 FROM public.driver_assignments da
    WHERE da.driver_id = auth.uid() AND da.bus_id = bus_locations.bus_id AND da.active
  )
);

-- 2. buses UPDATE: restrict to authenticated role
DROP POLICY IF EXISTS "Driver updates own bus status" ON public.buses;
CREATE POLICY "Driver updates own bus status"
ON public.buses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.driver_assignments da
    WHERE da.driver_id = auth.uid() AND da.bus_id = buses.id AND da.active
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.driver_assignments da
    WHERE da.driver_id = auth.uid() AND da.bus_id = buses.id AND da.active
  )
);

-- 3. Revoke EXECUTE on current_user_role from authenticated/anon/public
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM authenticated;
