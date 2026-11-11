-- Tidy-ups from Supabase's security advisor. Neither changes what the app can do.

-- 1. The rate-limit counters and drizzle's migration log live outside the API's schemas, and
--    the API roles have no access to them. Row-level security with no policies adds a second
--    lock: only their owner (migrations, SECURITY DEFINER functions) uses them, and owners
--    aren't subject to row-level security.
alter table private.rate_limit_hits enable row level security;
--> statement-breakpoint
-- drizzle-kit creates its log before running migrations; a hand-run setup may not have it yet.
alter table if exists drizzle.__drizzle_migrations enable row level security;
--> statement-breakpoint

-- 2. Trigger functions are never meant to be called through the API (/rest/v1/rpc/…).
--    Postgres runs triggers without checking EXECUTE, so taking it away only shrinks the API.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as fn
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.fn);
  end loop;
end
$$;
