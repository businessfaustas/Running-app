-- Race community: who's going and the per-race forum. Races themselves are the curated
-- calendar in packages/shared/src/races.ts, referenced here by slug.

-- ─── Replies stay one level deep and in the same race ────────────────────────
create or replace function public.check_race_post_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.race_posts;
begin
  if new.parent_id is null then
    return new;
  end if;
  select * into v_parent from public.race_posts p where p.id = new.parent_id;
  if v_parent.id is null or v_parent.race_slug <> new.race_slug then
    raise exception 'Reply must belong to a post in the same race' using errcode = 'check_violation';
  end if;
  if v_parent.parent_id is not null then
    raise exception 'Replies can only answer top-level posts' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger race_posts_check_parent
  before insert or update of parent_id, race_slug on public.race_posts
  for each row execute function public.check_race_post_parent();
--> statement-breakpoint

-- ─── Rate limits (same private counters as the rest of the app) ──────────────
create or replace function public.rate_limit_race_posts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('race_post:minute', 6, interval '1 minute');
  perform private.hit_rate_limit('race_post:day', 100, interval '1 day');
  return new;
end;
$$;
--> statement-breakpoint
create trigger race_posts_rate_limit
  before insert on public.race_posts
  for each row execute function public.rate_limit_race_posts();
--> statement-breakpoint
create or replace function public.rate_limit_race_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('race_attendance:10min', 30, interval '10 minutes');
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger race_attendees_rate_limit
  before insert or update or delete on public.race_attendees
  for each row execute function public.rate_limit_race_attendance();
--> statement-breakpoint

-- ─── Row-level security ──────────────────────────────────────────────────────
-- Race pages are public (like workouts); writing is as yourself only.
alter table public.race_attendees enable row level security;
--> statement-breakpoint
alter table public.race_posts enable row level security;
--> statement-breakpoint
create policy "Race attendance is public"
  on public.race_attendees for select to anon, authenticated
  using (true);
--> statement-breakpoint
create policy "Users mark their own attendance"
  on public.race_attendees for insert to authenticated
  with check ((select auth.uid()) = user_id);
--> statement-breakpoint
create policy "Users change their own attendance"
  on public.race_attendees for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
--> statement-breakpoint
create policy "Users remove their own attendance"
  on public.race_attendees for delete to authenticated
  using ((select auth.uid()) = user_id);
--> statement-breakpoint
create policy "Race forums are public"
  on public.race_posts for select to anon, authenticated
  using (true);
--> statement-breakpoint
create policy "Users post as themselves"
  on public.race_posts for insert to authenticated
  with check ((select auth.uid()) = author_id);
--> statement-breakpoint
create policy "Authors delete their posts"
  on public.race_posts for delete to authenticated
  using ((select auth.uid()) = author_id);
--> statement-breakpoint

grant select on public.race_attendees, public.race_posts to anon, authenticated;
--> statement-breakpoint
grant insert, update, delete on public.race_attendees to authenticated;
--> statement-breakpoint
grant insert, delete on public.race_posts to authenticated;
--> statement-breakpoint

-- ─── Read model: head-count per race for the calendar ────────────────────────
create or replace function public.race_attendance_counts()
returns table (race_slug text, attendees bigint)
language sql
stable
set search_path = ''
as $$
  select a.race_slug, count(*) from public.race_attendees a group by a.race_slug;
$$;
--> statement-breakpoint
grant execute on function public.race_attendance_counts() to anon, authenticated;
--> statement-breakpoint

-- ─── Realtime: new posts and attendance stream to open race pages ────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.race_posts, public.race_attendees;
  end if;
end;
$$;
