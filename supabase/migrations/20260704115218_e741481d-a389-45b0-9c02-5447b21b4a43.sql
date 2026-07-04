-- Allow a driver with an ACTIVE assignment to update the status of their own bus.
-- Admin ALL policy remains authoritative for every other operation.
CREATE POLICY "Driver updates own bus status"
  ON public.buses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_assignments da
      WHERE da.driver_id = auth.uid()
        AND da.bus_id = buses.id
        AND da.active
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.driver_assignments da
      WHERE da.driver_id = auth.uid()
        AND da.bus_id = buses.id
        AND da.active
    )
  );