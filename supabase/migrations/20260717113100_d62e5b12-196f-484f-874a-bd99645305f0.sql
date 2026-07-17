
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE public.retention_settings (
  table_name TEXT PRIMARY KEY,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.retention_settings TO authenticated;
GRANT ALL ON public.retention_settings TO service_role;
ALTER TABLE public.retention_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view retention settings" ON public.retention_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update retention settings" ON public.retention_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.retention_settings (table_name, retention_days) VALUES ('login_attempts', 30);

CREATE TABLE public.retention_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  cutoff_at TIMESTAMPTZ NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  error TEXT
);
GRANT SELECT ON public.retention_log TO authenticated;
GRANT ALL ON public.retention_log TO service_role;
ALTER TABLE public.retention_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view retention log" ON public.retention_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_retention_log_ran_at ON public.retention_log (ran_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days INTEGER;
  _cutoff TIMESTAMPTZ;
  _deleted INTEGER;
  _start TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT retention_days INTO _days FROM public.retention_settings WHERE table_name = 'login_attempts';
  _days := COALESCE(_days, 30);
  _cutoff := now() - make_interval(days => _days);

  DELETE FROM public.login_attempts WHERE created_at < _cutoff;
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  INSERT INTO public.retention_log (table_name, rows_deleted, cutoff_at, duration_ms)
  VALUES ('login_attempts', _deleted, _cutoff,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - _start)::INTEGER);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.retention_log (table_name, rows_deleted, cutoff_at, duration_ms, error)
  VALUES ('login_attempts', 0, now(),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - _start)::INTEGER, SQLERRM);
END;
$$;

SELECT cron.schedule('cleanup-login-attempts-daily', '0 3 * * *', $$SELECT public.cleanup_login_attempts();$$);

CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts (created_at);
