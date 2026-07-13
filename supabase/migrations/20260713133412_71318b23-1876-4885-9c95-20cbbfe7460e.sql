
REVOKE EXECUTE ON FUNCTION public.is_email_locked(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_locked(TEXT) TO service_role;
