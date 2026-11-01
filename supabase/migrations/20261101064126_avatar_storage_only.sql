-- Profile photos must be files in this project's own avatars bucket. Any other URL would make
-- every viewer's browser fetch it from a third-party server (a tracking pixel revealing IP
-- addresses). Clear such URLs first so the new rule can be added.
UPDATE "profiles" SET "avatar_url" = NULL WHERE "avatar_url" IS NOT NULL AND "avatar_url" !~ '^https://[^/]+/storage/v1/object/public/avatars/';--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_avatar_url_https";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_avatar_url_own_storage" CHECK ("profiles"."avatar_url" is null or ("profiles"."avatar_url" ~ '^https://[^/]+/storage/v1/object/public/avatars/' and char_length("profiles"."avatar_url") <= 500));