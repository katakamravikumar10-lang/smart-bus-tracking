
CREATE INDEX IF NOT EXISTS idx_faculty_assignments_year
  ON public.faculty_assignments (academic_year_id);
