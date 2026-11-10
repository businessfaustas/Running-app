-- Club photos: moments from clubs' runs and rides, added by signed-in runners. Anyone can
-- look (club pages are public); you add photos as yourself, into your own storage folder, and
-- only delete your own.

-- ─── Rate limits (same private counters as the rest of the app) ──────────────
create or replace function public.rate_limit_club_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit_rate_limit('club_photo:hour', 10, interval '1 hour');
  perform private.hit_rate_limit('club_photo:day', 30, interval '1 day');
  return new;
end;
$$;
--> statement-breakpoint
create trigger club_photos_rate_limit
  before insert on public.club_photos
  for each row execute function public.rate_limit_club_photos();
--> statement-breakpoint

-- ─── Row-level security ──────────────────────────────────────────────────────
alter table public.club_photos enable row level security;
--> statement-breakpoint
create policy "Club photos are public"
  on public.club_photos for select to anon, authenticated
  using (true);
--> statement-breakpoint
create policy "Users add photos as themselves"
  on public.club_photos for insert to authenticated
  with check ((select auth.uid()) = author_id);
--> statement-breakpoint
create policy "Authors delete their photos"
  on public.club_photos for delete to authenticated
  using ((select auth.uid()) = author_id);
--> statement-breakpoint
grant select on public.club_photos to anon, authenticated;
--> statement-breakpoint
grant insert, delete on public.club_photos to authenticated;
--> statement-breakpoint

-- ─── Storage: the club-photos bucket (skipped where Storage isn't installed) ──
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not found; skipping the club-photos bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('club-photos', 'club-photos', true, 3145728, array['image/webp', 'image/jpeg'])
  on conflict (id) do update
    set public = true,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists "Club photos: upload to own folder" on storage.objects';
  execute 'drop policy if exists "Club photos: delete from own folder" on storage.objects';

  execute $p$
    create policy "Club photos: upload to own folder" on storage.objects for insert to authenticated
    with check (bucket_id = 'club-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy "Club photos: delete from own folder" on storage.objects for delete to authenticated
    using (bucket_id = 'club-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
end
$$;
