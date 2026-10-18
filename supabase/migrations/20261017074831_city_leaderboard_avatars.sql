-- Workouts around a town, the weekly leaderboard and profile photos.

-- ─── Workouts near a point ───────────────────────────────────────────────────
-- Same shape as list_slots, limited to a radius (metres) around the chosen town.
-- Uses the GiST index on location::geography.
create or replace function public.list_slots_near(
  p_from date,
  p_to date,
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision
)
returns setof jsonb
language sql
stable
set search_path = ''
as $$
  select public.slot_summary_json(s)
    from public.workout_slots s
   where s.date between p_from and p_to
     and extensions.st_dwithin(
           s.location::extensions.geography,
           extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
           least(greatest(p_radius_m, 0), 100000)
         )
   order by s.date, s.start_time;
$$;
--> statement-breakpoint

-- ─── Leaderboard ─────────────────────────────────────────────────────────────
-- Per athlete, over finished, non-cancelled workouts in the date range they took part in:
-- kilometres run (RUN, TRACK) and ridden (CYCLING, GRAVEL), workouts and workouts hosted.
-- "Finished" uses Lithuanian wall-clock time, like the dates and times stored on slots.
-- Without a point it covers the whole country.
create or replace function public.leaderboard(
  p_from date,
  p_to date,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m double precision default null
)
returns setof jsonb
language sql
stable
set search_path = ''
as $$
  with done as (
    select s.id, s.host_id, s.sport_type, s.distance_km
      from public.workout_slots s
     where s.date between p_from and p_to
       and p_to - p_from <= 62
       and s.status <> 'CANCELLED'
       and s.date + s.start_time + coalesce(s.end_time - s.start_time, interval '1 hour')
           <= (now() at time zone 'Europe/Vilnius')
       and (
         p_lat is null or p_lng is null or extensions.st_dwithin(
           s.location::extensions.geography,
           extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
           least(greatest(coalesce(p_radius_m, 0), 0), 100000)
         )
       )
  ),
  per_user as (
    select sp.user_id,
           coalesce(sum(d.distance_km) filter (where d.sport_type in ('RUN', 'TRACK')), 0) as run_km,
           coalesce(sum(d.distance_km) filter (where d.sport_type in ('CYCLING', 'GRAVEL')), 0) as ride_km,
           count(*) as workouts,
           count(*) filter (where d.host_id = sp.user_id) as hosted
      from done d
      join public.slot_participants sp on sp.slot_id = d.id and sp.status = 'ACCEPTED'
     group by sp.user_id
  )
  select jsonb_build_object(
           'user', jsonb_build_object('id', p.id, 'name', p.name, 'avatarUrl', p.avatar_url),
           'runKm', round(u.run_km::numeric, 1),
           'rideKm', round(u.ride_km::numeric, 1),
           'workouts', u.workouts,
           'hosted', u.hosted
         )
    from per_user u
    join public.profiles p on p.id = u.user_id
   order by u.workouts desc, u.run_km + u.ride_km desc
   limit 200;
$$;
--> statement-breakpoint

grant execute on function
  public.list_slots_near(date, date, double precision, double precision, double precision),
  public.leaderboard(date, date, double precision, double precision, double precision)
  to anon, authenticated;
--> statement-breakpoint

-- ─── Profile photos (Supabase Storage) ───────────────────────────────────────
-- Public bucket: anyone can view photos by URL; people write only inside their own folder
-- (`<user id>/…`). Skipped where Storage isn't installed (plain Postgres for local tests).
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not found; skipping the avatars bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
  on conflict (id) do update
    set public = true,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists "Avatars: read own folder" on storage.objects';
  execute 'drop policy if exists "Avatars: upload to own folder" on storage.objects';
  execute 'drop policy if exists "Avatars: replace in own folder" on storage.objects';
  execute 'drop policy if exists "Avatars: delete from own folder" on storage.objects';

  -- Upserts (replacing the photo) need select as well as insert and update.
  execute $p$
    create policy "Avatars: read own folder" on storage.objects for select to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy "Avatars: upload to own folder" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy "Avatars: replace in own folder" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy "Avatars: delete from own folder" on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
end
$$;
