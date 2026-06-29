
REVOKE EXECUTE ON FUNCTION public.delete_expired_polls() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.delete_expired_polls() TO postgres, service_role;
