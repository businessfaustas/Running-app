-- Behaviour drizzle-kit doesn't model: triggers, row-level security and Realtime.
-- Functions pin `search_path = ''` and fully qualify every object they touch.

-- ─── updated_at bookkeeping ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
--> statement-breakpoint
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
--> statement-breakpoint
create trigger workout_slots_set_updated_at
  before update on public.workout_slots
  for each row execute function public.set_updated_at();
--> statement-breakpoint

-- ─── Profile per auth user ────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Athlete'
      ),
      80
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint

-- ─── Hosts are always participants of their own slot ──────────────────────────
create or replace function public.add_host_as_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.slot_participants (slot_id, user_id, status)
  values (new.id, new.host_id, 'ACCEPTED');
  return new;
end;
$$;
--> statement-breakpoint
create trigger workout_slots_add_host
  after insert on public.workout_slots
  for each row execute function public.add_host_as_participant();
--> statement-breakpoint

-- ─── Capacity: reject joins to full / closed slots ────────────────────────────
create or replace function public.enforce_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_status public.slot_status;
  v_accepted integer;
begin
  if new.status <> 'ACCEPTED' or (tg_op = 'UPDATE' and old.status = 'ACCEPTED') then
    return new;
  end if;

  -- Lock the slot row so concurrent joins are serialised.
  select s.max_participants, s.status
    into v_max, v_status
    from public.workout_slots s
   where s.id = new.slot_id
     for update;

  if v_status in ('CANCELLED', 'COMPLETED') then
    raise exception 'Workout is %', lower(v_status::text) using errcode = 'check_violation';
  end if;

  if v_max is not null then
    select count(*) into v_accepted
      from public.slot_participants p
     where p.slot_id = new.slot_id and p.status = 'ACCEPTED';
    if v_accepted >= v_max then
      raise exception 'Workout is full' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
--> statement-breakpoint
create trigger slot_participants_enforce_capacity
  before insert or update of status on public.slot_participants
  for each row execute function public.enforce_slot_capacity();
--> statement-breakpoint

-- ─── Keep OPEN/FULL in sync with the accepted head-count ──────────────────────
create or replace function public.slot_status_for(p_slot_id uuid, p_max integer)
returns public.slot_status
language sql
stable
set search_path = ''
as $$
  select case
    when p_max is not null and (
      select count(*) from public.slot_participants p
       where p.slot_id = p_slot_id and p.status = 'ACCEPTED'
    ) >= p_max
    then 'FULL'::public.slot_status
    else 'OPEN'::public.slot_status
  end;
$$;
--> statement-breakpoint
create or replace function public.sync_slot_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot_id uuid;
begin
  if tg_op = 'DELETE' then
    v_slot_id := old.slot_id;
  else
    v_slot_id := new.slot_id;
  end if;

  update public.workout_slots s
     set status = public.slot_status_for(s.id, s.max_participants)
   where s.id = v_slot_id
     and s.status in ('OPEN', 'FULL')
     and s.status is distinct from public.slot_status_for(s.id, s.max_participants);

  return null;
end;
$$;
--> statement-breakpoint
create trigger slot_participants_sync_status
  after insert or delete or update of status on public.slot_participants
  for each row execute function public.sync_slot_status();
--> statement-breakpoint
create or replace function public.sync_status_on_capacity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('OPEN', 'FULL') then
    new.status := public.slot_status_for(new.id, new.max_participants);
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger workout_slots_sync_status_on_capacity_change
  before update of max_participants on public.workout_slots
  for each row
  when (old.max_participants is distinct from new.max_participants)
  execute function public.sync_status_on_capacity_change();
--> statement-breakpoint

-- ─── Row-level security ──────────────────────────────────────────────────────
-- The API connects as a privileged role and enforces its own rules; these policies
-- govern direct Supabase client access (and therefore Realtime subscriptions).
alter table public.profiles enable row level security;
--> statement-breakpoint
alter table public.workout_slots enable row level security;
--> statement-breakpoint
alter table public.slot_participants enable row level security;
--> statement-breakpoint
alter table public.slot_messages enable row level security;
--> statement-breakpoint

-- Membership check for chat policies. SECURITY DEFINER so it isn't itself filtered by RLS.
create or replace function public.is_slot_member(p_slot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.slot_participants p
     where p.slot_id = p_slot_id
       and p.user_id = (select auth.uid())
       and p.status = 'ACCEPTED'
  );
$$;
--> statement-breakpoint

create policy "Profiles are visible to signed-in users"
  on public.profiles for select to authenticated
  using (true);
--> statement-breakpoint
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
--> statement-breakpoint

create policy "Slots are visible to signed-in users"
  on public.workout_slots for select to authenticated
  using (true);
--> statement-breakpoint
create policy "Users host their own slots"
  on public.workout_slots for insert to authenticated
  with check ((select auth.uid()) = host_id);
--> statement-breakpoint
create policy "Hosts update their slots"
  on public.workout_slots for update to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id);
--> statement-breakpoint
create policy "Hosts delete their slots"
  on public.workout_slots for delete to authenticated
  using ((select auth.uid()) = host_id);
--> statement-breakpoint

create policy "Attendance is visible to signed-in users"
  on public.slot_participants for select to authenticated
  using (true);
--> statement-breakpoint
create policy "Users join slots as themselves"
  on public.slot_participants for insert to authenticated
  with check ((select auth.uid()) = user_id);
--> statement-breakpoint
create policy "Hosts manage attendance"
  on public.slot_participants for update to authenticated
  using (exists (
    select 1 from public.workout_slots s
     where s.id = slot_id and s.host_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_slots s
     where s.id = slot_id and s.host_id = (select auth.uid())
  ));
--> statement-breakpoint
-- Participants can leave and hosts can remove people, but a host never leaves their own slot.
create policy "Participants leave, hosts remove"
  on public.slot_participants for delete to authenticated
  using (
    exists (
      select 1 from public.workout_slots s
       where s.id = slot_id
         and s.host_id <> user_id
         and (select auth.uid()) in (user_id, s.host_id)
    )
  );
--> statement-breakpoint

create policy "Members read the slot chat"
  on public.slot_messages for select to authenticated
  using (public.is_slot_member(slot_id));
--> statement-breakpoint
create policy "Members post to the slot chat"
  on public.slot_messages for insert to authenticated
  with check ((select auth.uid()) = sender_id and public.is_slot_member(slot_id));
--> statement-breakpoint
create policy "Senders delete their messages"
  on public.slot_messages for delete to authenticated
  using ((select auth.uid()) = sender_id);
--> statement-breakpoint

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Chat messages, attendance and slot changes stream to subscribed clients (RLS applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime
      add table public.slot_messages, public.slot_participants, public.workout_slots;
  end if;
end;
$$;
