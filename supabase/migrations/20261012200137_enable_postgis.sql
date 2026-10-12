-- PostGIS for meeting-point coordinates and radius search.
-- Supabase keeps extensions in the `extensions` schema, which is on the default search_path.
create schema if not exists extensions;
--> statement-breakpoint
create extension if not exists postgis with schema extensions;
