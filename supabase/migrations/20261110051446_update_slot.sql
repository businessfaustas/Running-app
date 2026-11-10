-- Hosts edit their own workouts. Runs as the caller, so row-level security also applies. A
-- finished or cancelled workout can't be changed, a moved start can't be in the past, and the
-- group can't be made smaller than the number of people already going.
create or replace function public.update_slot(p_id uuid, p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_slot public.workout_slots;
  v_now timestamp := now() at time zone 'Europe/Vilnius';
  v_date date := (p ->> 'date')::date;
  v_start time := (p ->> 'startTime')::time;
  v_max integer := (p ->> 'maxParticipants')::integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to edit a workout' using errcode = '42501';
  end if;

  select * into v_slot
    from public.workout_slots s
   where s.id = p_id and s.host_id = (select auth.uid());
  if v_slot.id is null then
    raise exception 'Only the host can edit this workout' using errcode = '42501';
  end if;
  if v_slot.status in ('CANCELLED', 'COMPLETED') then
    raise exception 'Workout is %', lower(v_slot.status::text) using errcode = 'check_violation';
  end if;
  -- Same rule as the app's isPast: over once the end (or the start, without an end) has passed.
  if v_slot.date + coalesce(v_slot.end_time, v_slot.start_time) <= v_now then
    raise exception 'Workout has finished' using errcode = 'check_violation';
  end if;
  if (v_date, v_start) is distinct from (v_slot.date, v_slot.start_time)
     and v_date + v_start <= v_now then
    raise exception 'New start is in the past' using errcode = 'check_violation';
  end if;
  if v_max is not null and v_max < public.slot_head_count(p_id) then
    raise exception 'Fewer places than people going' using errcode = 'check_violation';
  end if;

  update public.workout_slots s set
    title = p ->> 'title',
    sport_type = (p ->> 'sportType')::public.sport_type,
    date = v_date,
    start_time = v_start,
    end_time = (p ->> 'endTime')::time,
    distance_km = (p ->> 'distanceKm')::double precision,
    target_pace = p ->> 'targetPace',
    vibe_tag = (p ->> 'vibeTag')::public.vibe_tag,
    description = nullif(p ->> 'description', ''),
    meeting_point_name = p #>> '{meetingPoint,name}',
    location = extensions.st_setsrid(
      extensions.st_makepoint(
        (p #>> '{meetingPoint,lng}')::double precision,
        (p #>> '{meetingPoint,lat}')::double precision
      ),
      4326
    ),
    max_participants = v_max
   where s.id = p_id
  returning * into v_slot;

  return public.slot_summary_json(v_slot);
end;
$$;
--> statement-breakpoint
grant execute on function public.update_slot(uuid, jsonb) to authenticated;
