ALTER TABLE "profiles" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
-- People who signed up before onboarding existed don't need to go through it.
UPDATE "profiles" SET "onboarded_at" = "created_at" WHERE "onboarded_at" IS NULL;--> statement-breakpoint
-- Bring existing rows in line with the new checks so adding them can't fail.
UPDATE "profiles" SET "strava_id" = NULL WHERE "strava_id" IS NOT NULL AND "strava_id" !~ '^[0-9]{1,20}$';--> statement-breakpoint
UPDATE "profiles" SET "bio" = left("bio", 280) WHERE char_length("bio") > 280;--> statement-breakpoint
UPDATE "profiles" SET "avatar_url" = NULL WHERE "avatar_url" IS NOT NULL AND ("avatar_url" NOT LIKE 'https://%' OR char_length("avatar_url") > 500);--> statement-breakpoint
CREATE INDEX "slot_messages_sender_created_idx" ON "slot_messages" USING btree ("sender_id","created_at");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_bio_length" CHECK ("profiles"."bio" is null or char_length("profiles"."bio") <= 280);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_strava_id_format" CHECK ("profiles"."strava_id" is null or "profiles"."strava_id" ~ '^[0-9]{1,20}$');--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_avatar_url_https" CHECK ("profiles"."avatar_url" is null or ("profiles"."avatar_url" like 'https://%' and char_length("profiles"."avatar_url") <= 500));--> statement-breakpoint
ALTER TABLE "workout_slots" ADD CONSTRAINT "workout_slots_distance_max" CHECK ("workout_slots"."distance_km" <= 400);--> statement-breakpoint
ALTER TABLE "workout_slots" ADD CONSTRAINT "workout_slots_target_pace_length" CHECK (char_length("workout_slots"."target_pace") between 1 and 40);--> statement-breakpoint
ALTER TABLE "workout_slots" ADD CONSTRAINT "workout_slots_meeting_point_length" CHECK (char_length("workout_slots"."meeting_point_name") between 2 and 120);