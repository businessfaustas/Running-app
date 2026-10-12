CREATE TYPE "public"."participant_status" AS ENUM('ACCEPTED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('OPEN', 'FULL', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."sport_discipline" AS ENUM('running', 'cycling');--> statement-breakpoint
CREATE TYPE "public"."sport_type" AS ENUM('RUN', 'CYCLING', 'GRAVEL', 'TRACK');--> statement-breakpoint
CREATE TYPE "public"."vibe_tag" AS ENUM('ZONE_2_COFFEE', 'PACE_PUSH', 'SOCIAL_CHAT', 'LONG_RUN', 'INTERVALS');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"sports" "sport_discipline"[] DEFAULT '{}' NOT NULL,
	"default_paces" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strava_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_strava_id_unique" UNIQUE("strava_id"),
	CONSTRAINT "profiles_name_length" CHECK (char_length("profiles"."name") between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "slot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_messages_content_length" CHECK (char_length("slot_messages"."content") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "slot_participants" (
	"slot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "participant_status" DEFAULT 'ACCEPTED' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_participants_slot_id_user_id_pk" PRIMARY KEY("slot_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workout_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sport_type" "sport_type" NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"distance_km" double precision NOT NULL,
	"target_pace" text NOT NULL,
	"vibe_tag" "vibe_tag" NOT NULL,
	"meeting_point_name" text NOT NULL,
	"location" geometry(Point, 4326) NOT NULL,
	"max_participants" integer,
	"status" "slot_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_slots_title_length" CHECK (char_length("workout_slots"."title") between 1 and 120),
	CONSTRAINT "workout_slots_distance_positive" CHECK ("workout_slots"."distance_km" > 0),
	CONSTRAINT "workout_slots_end_after_start" CHECK ("workout_slots"."end_time" is null or "workout_slots"."end_time" > "workout_slots"."start_time"),
	CONSTRAINT "workout_slots_max_participants_min" CHECK ("workout_slots"."max_participants" is null or "workout_slots"."max_participants" >= 2)
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_messages" ADD CONSTRAINT "slot_messages_slot_id_workout_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."workout_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_messages" ADD CONSTRAINT "slot_messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_participants" ADD CONSTRAINT "slot_participants_slot_id_workout_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."workout_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_participants" ADD CONSTRAINT "slot_participants_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_slots" ADD CONSTRAINT "workout_slots_host_id_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slot_messages_slot_created_idx" ON "slot_messages" USING btree ("slot_id","created_at");--> statement-breakpoint
CREATE INDEX "slot_participants_user_idx" ON "slot_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_slots_date_start_idx" ON "workout_slots" USING btree ("date","start_time");--> statement-breakpoint
CREATE INDEX "workout_slots_host_idx" ON "workout_slots" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "workout_slots_location_geog_idx" ON "workout_slots" USING gist (("location"::geography));