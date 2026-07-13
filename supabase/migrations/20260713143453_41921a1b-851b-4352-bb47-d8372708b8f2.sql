
-- 1. Academic Years master table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','archived')),
  locked BOOLEAN NOT NULL DEFAULT false,
  promotions_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;
GRANT ALL ON public.academic_years TO service_role;

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone signed-in can view academic years"
  ON public.academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert academic years"
  ON public.academic_years FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update academic years"
  ON public.academic_years FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete upcoming years only"
  ON public.academic_years FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND status = 'upcoming');

CREATE TRIGGER trg_academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only one active year at a time
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_academic_year
  ON public.academic_years ((status = 'active')) WHERE status = 'active';

-- 2. Extend profiles with academic fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS student_status TEXT NOT NULL DEFAULT 'active'
    CHECK (student_status IN ('active','graduated','archived'));

CREATE INDEX IF NOT EXISTS idx_profiles_academic_year ON public.profiles(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(student_status);
CREATE INDEX IF NOT EXISTS idx_profiles_roll_no ON public.profiles(roll_no);

-- 3. Link operational tables to Academic Year (for year-scoped history)
ALTER TABLE public.student_assignments
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_stu_assign_year ON public.student_assignments(academic_year_id);

ALTER TABLE public.driver_assignments
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_drv_assign_year ON public.driver_assignments(academic_year_id);

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trips_year ON public.trips(academic_year_id);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 4. Faculty assignment history (keeps every year separate)
CREATE TABLE IF NOT EXISTS public.faculty_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  boarding_stop TEXT,
  department TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, academic_year_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_assignments TO authenticated;
GRANT ALL ON public.faculty_assignments TO service_role;

ALTER TABLE public.faculty_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in can view faculty assignments"
  ON public.faculty_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage faculty assignments"
  ON public.faculty_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_faculty_assignments_updated_at
  BEFORE UPDATE ON public.faculty_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Student promotion history (never lose data)
CREATE TABLE IF NOT EXISTS public.student_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_year_of_study INTEGER,
  to_year_of_study INTEGER,
  from_academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  to_academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('promote','graduate','archive','reinstate')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.student_promotions TO authenticated;
GRANT ALL ON public.student_promotions TO service_role;

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view promotions"
  ON public.student_promotions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert promotions"
  ON public.student_promotions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_promotions_student ON public.student_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_promotions_year ON public.student_promotions(to_academic_year_id);

-- 6. Bulk-import staging summary
CREATE TABLE IF NOT EXISTS public.student_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  error_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.student_imports TO authenticated;
GRANT ALL ON public.student_imports TO service_role;

ALTER TABLE public.student_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view imports"
  ON public.student_imports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create imports"
  ON public.student_imports FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND imported_by = auth.uid());

-- 7. Helper: current active academic year id
CREATE OR REPLACE FUNCTION public.active_academic_year_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.academic_years WHERE status = 'active' LIMIT 1
$$;

-- 8. Guard writes on locked/archived years: block updates to student_assignments in a locked year
CREATE OR REPLACE FUNCTION public.block_writes_on_locked_year()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year_id UUID;
  _locked BOOLEAN;
  _status TEXT;
BEGIN
  _year_id := COALESCE(NEW.academic_year_id, OLD.academic_year_id);
  IF _year_id IS NULL THEN RETURN NEW; END IF;
  SELECT locked, status INTO _locked, _status FROM public.academic_years WHERE id = _year_id;
  IF _locked OR _status = 'archived' THEN
    RAISE EXCEPTION 'Academic year is locked/archived; writes are not permitted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stu_assign_locked
  BEFORE INSERT OR UPDATE OR DELETE ON public.student_assignments
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_on_locked_year();

CREATE TRIGGER trg_drv_assign_locked
  BEFORE INSERT OR UPDATE OR DELETE ON public.driver_assignments
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_on_locked_year();

CREATE TRIGGER trg_faculty_assign_locked
  BEFORE INSERT OR UPDATE OR DELETE ON public.faculty_assignments
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_on_locked_year();
