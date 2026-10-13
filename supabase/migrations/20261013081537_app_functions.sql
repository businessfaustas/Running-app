-- What the web app reads and writes directly through Supabase (apps/web/src/backend/supabase.ts).
-- The JSON shapes match SlotSummary, SlotDetail, UserSlot and ChatThread in
-- packages/shared/src/domain.ts. Functions run as the caller, so row-level security applies.

-- ─── Browsing is public; chat stays members-only ─────────────────────────────
drop policy "Profiles are visible to signed-in users" on public.profiles;
--> statement-breakpoint
create policy "Profiles are public"
  on public.profiles for select to anon, authenticated
  using (true);
--> statement-breakpoint
drop policy "Slots are visible to signed-in users" on public.workout_slots;
--> statement-breakpoint
create policy "Slots are public"
  on public.workout_slots for select to anon, authenticated
  using (true);
--> statement-breakpoint
drop policy "Attendance is visible to signed-in users" on public.slot_participants;
--> statement-breakpoint
create policy "Attendance is public"
  on public.slot_participants for select to anon, authenticated
  using (true);
--> statement-breakpoint

-- ─── Read models ─────────────────────────────────────────────────────────────
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
    'participantCount', (
      select count(*)
        from public.slot_participants sp
       where sp.slot_id = s.id and sp.status = 'ACCEPTED'
    ),
    'participantPreview', coalesce((
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
    ), '[]'::jsonb)
  );
$$;
--> statement-breakpoint

create or replace function public.list_slots(p_from date, p_to date)
returns setof jsonb
language sql
stable
set search_path = ''
as $$
  select public.slot_summary_json(s)
    from public.workout_slots s
   where s.date between p_from and p_to
   order by s.date, s.start_time;
$$;
--> statement-breakpoint

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
    ), '[]'::jsonb)
  )
    from public.workout_slots s
   where s.id = p_id;
$$;
--> statement-breakpoint

create or replace function public.list_user_slots(p_user uuid)
returns setof jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
           'slot', public.slot_summary_json(s),
           'role', case when s.host_id = p_user then 'HOST' else 'PARTICIPANT' end
         )
    from public.workout_slots s
    join public.slot_participants sp on sp.slot_id = s.id
   where sp.user_id = p_user and sp.status = 'ACCEPTED'
   order by s.date, s.start_time;
$$;
--> statement-breakpoint

-- Chats for the signed-in user's workouts (from a week ago on), most recent activity first.
create or replace function public.list_threads()
returns setof jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('slot', public.slot_summary_json(s), 'lastMessage', m.message)
    from public.workout_slots s
    join public.slot_participants sp
      on sp.slot_id = s.id and sp.user_id = (select auth.uid()) and sp.status = 'ACCEPTED'
    left join lateral (
      select jsonb_build_object(
               'id', msg.id,
               'slotId', msg.slot_id,
               'content', msg.content,
               'createdAt', msg.created_at,
               'sender', jsonb_build_object('id', p.id, 'name', p.name, 'avatarUrl', p.avatar_url)
             ) as message,
             msg.created_at
        from public.slot_messages msg
        join public.profiles p on p.id = msg.sender_id
       where msg.slot_id = s.id
       order by msg.created_at desc
       limit 1
    ) m on true
   where s.date >= current_date - 7
   order by m.created_at desc nulls last, s.date, s.start_time;
$$;
--> statement-breakpoint

-- ─── Writes ──────────────────────────────────────────────────────────────────
-- Takes a NewSlotInput; the signed-in user becomes the host (and, by trigger, a participant).
create or replace function public.create_slot(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_slot public.workout_slots;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to post a workout' using errcode = '42501';
  end if;

  insert into public.workout_slots (
    host_id, title, sport_type, date, start_time, end_time, distance_km, target_pace,
    vibe_tag, description, meeting_point_name, location, max_participants
  ) values (
    (select auth.uid()),
    p ->> 'title',
    (p ->> 'sportType')::public.sport_type,
    (p ->> 'date')::date,
    (p ->> 'startTime')::time,
    (p ->> 'endTime')::time,
    (p ->> 'distanceKm')::double precision,
    p ->> 'targetPace',
    (p ->> 'vibeTag')::public.vibe_tag,
    nullif(p ->> 'description', ''),
    p #>> '{meetingPoint,name}',
    extensions.st_setsrid(
      extensions.st_makepoint(
        (p #>> '{meetingPoint,lng}')::double precision,
        (p #>> '{meetingPoint,lat}')::double precision
      ),
      4326
    ),
    (p ->> 'maxParticipants')::integer
  )
  returning * into v_slot;

  return public.slot_summary_json(v_slot);
end;
$$;
--> statement-breakpoint

-- ─── Explicit grants ─────────────────────────────────────────────────────────
-- Don't rely on project defaults; row-level security above still decides which rows.
grant select on public.profiles, public.workout_slots, public.slot_participants to anon, authenticated;
--> statement-breakpoint
grant update on public.profiles to authenticated;
--> statement-breakpoint
grant insert, update, delete on public.workout_slots, public.slot_participants to authenticated;
--> statement-breakpoint
grant select, insert, delete on public.slot_messages to authenticated;
--> statement-breakpoint
grant execute on function
  public.slot_summary_json(public.workout_slots),
  public.list_slots(date, date),
  public.get_slot(uuid),
  public.list_user_slots(uuid)
  to anon, authenticated;
--> statement-breakpoint
grant execute on function public.list_threads(), public.create_slot(jsonb) to authenticated;
