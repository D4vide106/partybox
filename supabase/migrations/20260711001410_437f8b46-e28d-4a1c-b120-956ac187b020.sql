CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT clock_timestamp();
$$;

GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon, authenticated, service_role;