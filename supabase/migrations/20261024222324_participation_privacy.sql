-- Runner safety: who is going to a workout is visible only to the people in it.
-- Everyone else still sees the head-count, the host and the meeting place – but not names,
-- or a stranger could look up where a specific person will be and when. Race attendance
-- (a crowd at a public event) is visible to signed-in runners; visitors see counts.

-- ─── Head-counts without revealing who ───────────────────────────────────────
-- SECURITY DEFINER so the rows it counts aren't hidden by the policies below.
create or replace function public.slot_head_count(p_slot_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.slot_participants p
   where p.slot_id = p_slot_id and p.status = 'ACCEPTED';
$$;
--> statement-breakpoint
grant execute on function public.slot_head_count(uuid) to anon, authenticated;
--> statement-breakpoint

create or replace function public.slot_status_for(p_slot_id uuid, p_max integer)
returns public.slot_status
language sql
stable
set search_path = ''
as $$
  select case
    when p_max is not null and public.slot_head_count(p_slot_id) >= p_max
    then 'FULL'::public.slot_status
    else 'OPEN'::public.slot_status
  end;
$$;
--> statement-breakpoint

-- ─── Participant rows: your own, and those of workouts you're in ─────────────
drop policy if exists "Attendance is public" on public.slot_participants;
--> statement-breakpoint
create policy "Members see who is going"
  on public.slot_participants for select to authenticated
  using ((select auth.uid()) = user_id or public.is_slot_member(slot_id));
--> statement-breakpoint

-- ─── Workout summaries: avatars of who's going only for members ──────────────
create or replace function public.slot_summary_json(s public.workout_slots)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'sportType', s.sport_type,
    'date', s.date,
    'startTime', left(s.start_time::text, 5),
    'endTime', left(s.end_time::text, 5),
    'distanceKm', s.distance_km,
    'targetPace', s.target_pace,
    'vibeTag', s.vibe_tag,
    'meetingPoint', jsonb_build_object(
      'name', s.meeting_point_name,
      'lat', extensions.st_y(s.location),
      'lng', extensions.st_x(s.location)
    ),
    'maxParticipants', s.max_participants,
    'status', s.status,
    'host', (
      select jsonb_build_object('id', p.id, 'name', p.name, 'avatarUrl', p.avatar_url)
        from public.profiles p
       where p.id = s.host_id
    ),
    'participantCount', public.slot_head_count(s.id),
    'participantPreview', case when public.is_slot_member(s.id) then coalesce((
      select jsonb_agg(
               jsonb_build_object('id', x.id, 'name', x.name, 'avatarUrl', x.avatar_url)
               order by x.joined_at
             )
        from (
          select p.id, p.name, p.avatar_url, sp.joined_at
            from public.slot_participants sp
            join public.profiles p on p.id = sp.user_id
           where sp.slot_id = s.id and sp.status = 'ACCEPTED' and sp.user_id <> s.host_id
           order by sp.joined_at
           limit 3
        ) x
    ), '[]'::jsonb) else '[]'::jsonb end
  );
$$;
--> statement-breakpoint

-- Workout page: the full list for members; others get their own entry at most.
create or replace function public.get_slot(p_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.slot_summary_json(s) || jsonb_build_object(
    'description', s.description,
    'participants', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', p.id,
                 'name', p.name,
                 'avatarUrl', p.avatar_url,
                 'defaultPaces', p.default_paces,
                 'status', sp.status,
                 'joinedAt', sp.joined_at,
                 'isHost', sp.user_id = s.host_id
               )
               order by sp.user_id = s.host_id desc, sp.joined_at
             )
        from public.slot_participants sp
        join public.profiles p on p.id = sp.user_id
       where sp.slot_id = s.id
         and (public.is_slot_member(s.id) or sp.user_id = (select auth.uid()))
    ), '[]'::jsonb)
  )
    from public.workout_slots s
   where s.id = p_id;
$$;
--> statement-breakpoint

-- A runner's workouts: everything for yourself. For anyone else, the ones they host
-- (a host publishes the workout) and ones already finished (for stats and badges) –
-- never upcoming workouts they've only joined.
create or replace function public.list_user_slots(p_user uuid)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'slot', public.slot_summary_json(s),
           'role', case when s.host_id = p_user then 'HOST' else 'PARTICIPANT' end
         )
    from public.workout_slots s
    join public.slot_participants sp on sp.slot_id = s.id
   where sp.user_id = p_user
     and sp.status = 'ACCEPTED'
     and (
       p_user = (select auth.uid())
       or s.host_id = p_user
       or s.date + coalesce(s.end_time, s.start_time + interval '1 hour')
          <= (now() at time zone 'Europe/Vilnius')
     )
   order by s.date, s.start_time;
$$;
--> statement-breakpoint

-- Aggregates only (km, counts), so it may count rows the caller can't see.
alter function public.leaderboard(date, date, double precision, double precision, double precision)
  security definer;
--> statement-breakpoint

-- ─── Races: names for signed-in runners, counts for everyone ─────────────────
drop policy if exists "Race attendance is public" on public.race_attendees;
--> statement-breakpoint
create policy "Signed-in runners see who is going"
  on public.race_attendees for select to authenticated
  using (true);
--> statement-breakpoint
alter function public.race_attendance_counts() security definer;
