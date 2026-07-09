
-- 1. Switch role helpers to SECURITY INVOKER (users can read own role via RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 2. Avatars bucket: require authenticated to SELECT (signed URLs still work)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- 3. Signup trigger: never allow self-assigning admin OR driver. Faculty/student ok.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requested text;
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, roll_no, department)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'roll_no',
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO NOTHING;

  _requested := NULLIF(NEW.raw_user_meta_data->>'role', '');

  -- Only student or faculty may be self-assigned. Admin and driver require admin approval.
  IF _requested IN ('student', 'faculty') THEN
    _role := _requested::public.app_role;
  ELSE
    _role := 'student'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Drivers may only post emergency announcements when they have an active assignment
DROP POLICY IF EXISTS "Drivers create emergency" ON public.announcements;
CREATE POLICY "Drivers create emergency"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'driver'::public.app_role)
  AND is_emergency = true
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.driver_assignments da
    WHERE da.driver_id = auth.uid() AND da.active
  )
);
