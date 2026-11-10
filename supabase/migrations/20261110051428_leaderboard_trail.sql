-- Trail runs count towards the running kilometres. Sports are compared as text: a new enum
-- value can't be used in the same transaction that adds it (migration 'more_sports').
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
security definer
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
           coalesce(sum(d.distance_km) filter (where d.sport_type::text in ('RUN', 'TRACK', 'TRAIL')), 0) as run_km,
           coalesce(sum(d.distance_km) filter (where d.sport_type::text in ('CYCLING', 'GRAVEL')), 0) as ride_km,
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
