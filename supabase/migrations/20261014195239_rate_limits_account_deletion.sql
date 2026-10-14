-- Rate limits on writes and self-service account deletion.

-- ─── Rate limits ─────────────────────────────────────────────────────────────
-- Generous for people, tight enough to stop a script flooding the database through the
-- public API. Counters live in a schema the API doesn't expose. A blocked request rolls
-- back, so only successful actions count. The web app turns "Rate limit exceeded" into a
-- friendly message.
create schema if not exists private;
--> statement-breakpoint
revoke all on schema private from public;
--> statement-breakpoint
create table private.rate_limit_hits (
  user_id uuid not null,
  action text not null,
  at timestamptz not null default now()
);
--> statement-breakpoint
create index rate_limit_hits_lookup_idx on private.rate_limit_hits (user_id, action, at);
--> statement-breakpoint
create or replace function private.hit_rate_limit(p_action text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_count integer;
begin
  -- Seeds, migrations and the service role act without a user and aren't limited.
  -- Neither are knock-on writes made by other triggers and cascades (a host joining their
  -- own new workout, attendance removed along with a deleted workout or account).
  if v_user is null or pg_trigger_depth() > 1 then
    return;
  end if;

  delete from private.rate_limit_hits h
   where h.user_id = v_user and h.action = p_action and h.at < now() - p_window;

  select count(*) into v_count
    from private.rate_limit_hits h
   where h.user_id = v_user and h.action = p_action;

  if v_count >= p_max then
    raise exception 'Rate limit exceeded (%)', p_action using errcode = 'P0001';
  end if;

  insert into private.rate_limit_hits (user_id, action) values (v_user, p_action);
end;
$$;
--> statement-breakpoint
revoke all on function private.hit_rate_limit(text, integer, interval) from public;
--> statement-breakpoint

create or replace function public.rate_limit_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('message:minute', 20, interval '1 minute');
  perform private.hit_rate_limit('message:day', 1000, interval '1 day');
  return new;
end;
$$;
--> statement-breakpoint
create trigger slot_messages_rate_limit
  before insert on public.slot_messages
  for each row execute function public.rate_limit_messages();
--> statement-breakpoint

create or replace function public.rate_limit_workouts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('workout:minute', 3, interval '1 minute');
  perform private.hit_rate_limit('workout:day', 15, interval '1 day');
  return new;
end;
$$;
--> statement-breakpoint
create trigger workout_slots_rate_limit
  before insert on public.workout_slots
  for each row execute function public.rate_limit_workouts();
--> statement-breakpoint

-- Joining and leaving share one budget, so join/leave loops are caught too.
create or replace function public.rate_limit_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('attendance:10min', 40, interval '10 minutes');
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger slot_participants_rate_limit
  before insert or delete on public.slot_participants
  for each row execute function public.rate_limit_attendance();
--> statement-breakpoint

create or replace function public.rate_limit_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('profile:minute', 20, interval '1 minute');
  return new;
end;
$$;
--> statement-breakpoint
create trigger profiles_rate_limit
  before update on public.profiles
  for each row execute function public.rate_limit_profile_updates();
--> statement-breakpoint

-- ─── Delete my account ───────────────────────────────────────────────────────
-- Removes the caller's login. Their profile, the workouts they host (with those workouts'
-- attendance and chats), their attendance elsewhere and their messages cascade from it.
-- SECURITY DEFINER so no service key is ever needed in the browser; it can only ever
-- delete the caller.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Sign in to delete your account' using errcode = '28000';
  end if;
  delete from auth.users u where u.id = v_user;
end;
$$;
--> statement-breakpoint
revoke all on function public.delete_account() from public, anon;
--> statement-breakpoint
grant execute on function public.delete_account() to authenticated;
