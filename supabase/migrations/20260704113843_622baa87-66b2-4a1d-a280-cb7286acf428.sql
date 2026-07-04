
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo) WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_buses_is_demo ON public.buses(is_demo) WHERE is_demo;
CREATE INDEX IF NOT EXISTS idx_routes_is_demo ON public.routes(is_demo) WHERE is_demo;
