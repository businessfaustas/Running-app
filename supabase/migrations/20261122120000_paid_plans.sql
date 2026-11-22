-- Paid plans: PaceMates Plus (monthly / yearly, optional free trial) and one-off race passes.
--
-- Payment is handled by Stripe. People never write to these tables: the Stripe webhook (an
-- edge function using the service-role key, which bypasses row-level security) is the only
-- writer, so nobody can give themselves a plan from the browser. Signed-in people can read
-- their own rows, and ask two questions through functions: "what am I entitled to" and
-- "which of these people are Plus members" (for the badge – it reveals nothing else).

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  plan text not null check (plan in ('plus_month', 'plus_year')),
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create table public.race_passes (
  user_id uuid not null references auth.users (id) on delete cascade,
  race_slug text not null check (char_length(race_slug) between 1 and 80),
  stripe_session_id text unique,
  purchased_at timestamptz not null default now(),
  primary key (user_id, race_slug)
);
--> statement-breakpoint
-- Stripe may deliver an event more than once; remembering the ids makes the webhook idempotent.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
--> statement-breakpoint

alter table public.subscriptions enable row level security;
--> statement-breakpoint
alter table public.race_passes enable row level security;
--> statement-breakpoint
alter table public.stripe_events enable row level security;
--> statement-breakpoint

create policy "Read own subscription" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
--> statement-breakpoint
create policy "Read own race passes" on public.race_passes
  for select to authenticated using (user_id = (select auth.uid()));
--> statement-breakpoint

-- Read-only for the owner; no insert, update or delete for anyone but the service role.
revoke all on public.subscriptions, public.race_passes, public.stripe_events from anon, authenticated;
--> statement-breakpoint
grant select on public.subscriptions, public.race_passes to authenticated;
--> statement-breakpoint

-- Whether a subscription gives access right now: trialing or active, or a failed payment that is
-- still inside the period already paid for. A cancelled-at-period-end subscription stays 'active'
-- until the period ends, so it keeps working until then and not a day longer.
create or replace function public.subscription_is_live(s public.subscriptions)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select s.status in ('trialing', 'active')
      or (s.status = 'past_due' and s.current_period_end is not null and s.current_period_end > now());
$$;
--> statement-breakpoint
revoke all on function public.subscription_is_live(public.subscriptions) from public, anon, authenticated;
--> statement-breakpoint

create or replace function public.my_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  s public.subscriptions;
  v_passes jsonb;
begin
  if v_user is null then
    return jsonb_build_object(
      'plus', false, 'status', 'none', 'plan', null, 'renewsAt', null,
      'trialEndsAt', null, 'cancelAtPeriodEnd', false, 'racePasses', '[]'::jsonb
    );
  end if;
  select * into s from public.subscriptions where user_id = v_user;
  select coalesce(jsonb_agg(p.race_slug order by p.race_slug), '[]'::jsonb)
    into v_passes from public.race_passes p where p.user_id = v_user;
  return jsonb_build_object(
    'plus', coalesce(s.user_id is not null and public.subscription_is_live(s), false),
    'status', coalesce(s.status, 'none'),
    'plan', s.plan,
    'renewsAt', s.current_period_end,
    'trialEndsAt', case when s.status = 'trialing' then s.trial_end end,
    'cancelAtPeriodEnd', coalesce(s.cancel_at_period_end, false),
    'racePasses', v_passes
  );
end;
$$;
--> statement-breakpoint
revoke all on function public.my_entitlements() from public, anon;
--> statement-breakpoint
grant execute on function public.my_entitlements() to authenticated;
--> statement-breakpoint

-- Which of these people are Plus members (for the profile badge). Says nothing else about them.
create or replace function public.plus_among(p_users uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(s.user_id), '{}'::uuid[])
    from public.subscriptions s
   where s.user_id = any (p_users[1:50])
     and public.subscription_is_live(s);
$$;
--> statement-breakpoint
revoke all on function public.plus_among(uuid[]) from public, anon;
--> statement-breakpoint
grant execute on function public.plus_among(uuid[]) to authenticated;
