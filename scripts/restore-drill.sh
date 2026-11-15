#!/usr/bin/env bash
# Restore drill: proves a database backup can really be restored, into a throwaway database.
#
#   scripts/restore-drill.sh path/to/pacemates.dump [admin-connection-url]
#
# The dump is the decrypted file from the "Database backup" workflow. The admin URL points at
# any PostgreSQL 15+ server with PostGIS installed (default: the PG* environment variables, so
# `PGHOST=… PGUSER=… PGPASSWORD=… scripts/restore-drill.sh dump` works). A scratch database is
# created, filled from the dump, checked, and dropped. Nothing else on the server is touched.
# The monthly "Restore drill" workflow runs this against the newest backup.
set -euo pipefail

dump="${1:?usage: restore-drill.sh <pacemates.dump> [admin-url]}"
admin="${2:-}"
psql_admin=(psql -X -q -v ON_ERROR_STOP=1)
[ -n "$admin" ] && psql_admin+=("$admin")
[ -f "$dump" ] || { echo "No such file: $dump" >&2; exit 2; }

db="restore_drill_$(date -u +%Y%m%d%H%M%S)"
# Connection to the scratch database: the admin URL with the database name swapped, or the PG*
# environment variables plus -d.
if [ -n "$admin" ]; then
  scratch_args=("$(echo "$admin" | sed -E "s#/[^/?]*(\?|$)#/$db\1#")")
else
  scratch_args=(-d "$db")
fi
fail() { echo "✗ $*" >&2; "${psql_admin[@]}" -c "drop database if exists \"$db\"" >/dev/null 2>&1 || true; exit 1; }

echo "1/5 The archive can be read"
pg_restore --list "$dump" > /dev/null || fail "pg_restore cannot read the dump (wrong file, or damaged?)"

echo "2/5 Preparing an empty scratch database ($db) like a fresh Supabase project"
"${psql_admin[@]}" -c "create database \"$db\"" -c "alter database \"$db\" set search_path = \"\$user\", public, extensions"
# Roles and helpers that Supabase provides and the dump refers to.
psql -X -q -v ON_ERROR_STOP=1 "${scratch_args[@]}" <<'SQL' 2>&1 | grep -v 'wal_level\|HINT' || true
do $$ begin
  create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticator noinherit nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role supabase_admin nologin; exception when duplicate_object then null; end $$;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now(), metadata jsonb);
create publication supabase_realtime;
drop schema public cascade;
SQL

echo "3/5 Restoring (schema and data)"
pg_restore --no-owner --exit-on-error --dbname "${scratch_args[@]: -1}" "$dump" || fail "restore failed"
psql_db=(psql -X -At -v ON_ERROR_STOP=1 "${scratch_args[@]}")

echo "4/5 Checking what came back"
count() { "${psql_db[@]}" -c "select count(*) from $1"; }
profiles=$(count public.profiles)
slots=$(count public.workout_slots)
users=$(count auth.users)
printf '   %-22s %s\n' "auth.users" "$users" "profiles" "$profiles" "workout_slots" "$slots" \
  "slot_participants" "$(count public.slot_participants)" "slot_messages" "$(count public.slot_messages)" \
  "race_attendees" "$(count public.race_attendees)" "race_posts" "$(count public.race_posts)"
[ "$profiles" -gt 0 ] || fail "no profiles after the restore"
[ "$users" -ge "$profiles" ] || fail "fewer logins ($users) than profiles ($profiles)"

no_rls=$("${psql_db[@]}" -c "select string_agg(tablename, ', ') from pg_tables t where schemaname='public' and not exists (select 1 from pg_class c where c.relname=t.tablename and c.relnamespace='public'::regnamespace and c.relrowsecurity)")
[ -z "$no_rls" ] || fail "row-level security is off for: $no_rls"
echo "   row-level security: on for every table"

triggers=$("${psql_db[@]}" -c "select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and c.relnamespace = 'public'::regnamespace")
[ "$triggers" -gt 0 ] || fail "no triggers after the restore"
echo "   triggers: $triggers"

"${psql_db[@]}" -c "select count(*) from public.workout_slots where st_dwithin(location::geography, st_makepoint(21.1443,55.7033)::geography, 1000000)" > /dev/null \
  || fail "location queries do not work (PostGIS)"
echo "   location queries: work"

echo "5/5 Cleaning up"
"${psql_admin[@]}" -c "drop database \"$db\""
echo "✓ Restore drill passed: $profiles profiles, $slots workouts restored into a fresh database."
