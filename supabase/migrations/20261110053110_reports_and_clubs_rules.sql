-- Who can do what with content reports and community-added clubs.

-- ─── Content reports (EU Digital Services Act, Art. 16) ──────────────────────
-- Anyone can send a notice, signed in or not. Nobody can read notices through the API: the
-- operator reviews them in the Supabase dashboard (see docs/GO-LIVE.md).
create or replace function public.rate_limit_content_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    perform private.hit_rate_limit('report:hour', 10, interval '1 hour');
    perform private.hit_rate_limit('report:day', 30, interval '1 day');
  elsif (
    -- Visitors have no account to count against, so they share one hourly budget.
    select count(*) from public.content_reports r
     where r.reporter_id is null and r.created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Rate limit exceeded (report)' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger content_reports_rate_limit
  before insert on public.content_reports
  for each row execute function public.rate_limit_content_reports();
--> statement-breakpoint
alter table public.content_reports enable row level security;
--> statement-breakpoint
-- Visitors must say who they are (DSA Art. 16(2)(c)); signed-in people already have. This is
-- checked here rather than as a table constraint so that deleting an account (which empties
-- reporter_id) keeps the notice.
create policy "Anyone can send a report as themselves"
  on public.content_reports for insert to anon, authenticated
  with check (
    reporter_id is not distinct from (select auth.uid())
    and status = 'NEW'
    and (reporter_id is not null or (reporter_name is not null and reporter_email is not null))
  );
--> statement-breakpoint
-- Supabase grants new tables to the API roles by default; take that back and allow only
-- sending.
revoke all on public.content_reports from anon, authenticated;
--> statement-breakpoint
grant insert on public.content_reports to anon, authenticated;
--> statement-breakpoint

-- ─── Community-added clubs ───────────────────────────────────────────────────
-- Signed-in people add clubs as PENDING; everyone sees a club once the operator sets it to
-- APPROVED, and until then only the person who added it does.
create or replace function public.rate_limit_club_submissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('club_submission:day', 3, interval '1 day');
  return new;
end;
$$;
--> statement-breakpoint
create trigger club_submissions_rate_limit
  before insert on public.club_submissions
  for each row execute function public.rate_limit_club_submissions();
--> statement-breakpoint
alter table public.club_submissions enable row level security;
--> statement-breakpoint
create policy "Approved clubs are public; your own are visible to you"
  on public.club_submissions for select to anon, authenticated
  using (status = 'APPROVED' or submitted_by = (select auth.uid()));
--> statement-breakpoint
create policy "Users add clubs as themselves, for review"
  on public.club_submissions for insert to authenticated
  with check (submitted_by = (select auth.uid()) and status = 'PENDING');
--> statement-breakpoint
-- Who added a club stays private: every column but submitted_by is readable. (Supabase grants
-- whole new tables to the API roles by default, so start from nothing.)
revoke all on public.club_submissions from anon, authenticated;
--> statement-breakpoint
grant select (
  id, slug, name, types, city, description, schedule, meeting_place, website, facebook,
  instagram, strava, email, lat, lng, status, created_at
) on public.club_submissions to anon, authenticated;
--> statement-breakpoint
grant insert on public.club_submissions to authenticated;
