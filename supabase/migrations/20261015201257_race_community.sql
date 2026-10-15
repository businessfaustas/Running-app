CREATE TYPE "public"."race_post_topic" AS ENUM('TIP', 'QUESTION', 'GEAR', 'LOGISTICS', 'GENERAL');--> statement-breakpoint
CREATE TABLE "race_attendees" (
	"race_slug" text NOT NULL,
	"user_id" uuid NOT NULL,
	"distance_km" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "race_attendees_race_slug_user_id_pk" PRIMARY KEY("race_slug","user_id"),
	CONSTRAINT "race_attendees_slug_format" CHECK ("race_attendees"."race_slug" ~ '^[a-z0-9-]{3,80}$'),
	CONSTRAINT "race_attendees_distance_range" CHECK ("race_attendees"."distance_km" is null or ("race_attendees"."distance_km" > 0 and "race_attendees"."distance_km" <= 400))
);
--> statement-breakpoint
CREATE TABLE "race_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_slug" text NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"topic" "race_post_topic" DEFAULT 'GENERAL' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "race_posts_slug_format" CHECK ("race_posts"."race_slug" ~ '^[a-z0-9-]{3,80}$'),
	CONSTRAINT "race_posts_content_length" CHECK (char_length("race_posts"."content") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "race_attendees" ADD CONSTRAINT "race_attendees_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_posts" ADD CONSTRAINT "race_posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_posts" ADD CONSTRAINT "race_posts_parent_id_race_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."race_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "race_attendees_user_idx" ON "race_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "race_posts_race_created_idx" ON "race_posts" USING btree ("race_slug","created_at");--> statement-breakpoint
CREATE INDEX "race_posts_author_created_idx" ON "race_posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "race_posts_parent_idx" ON "race_posts" USING btree ("parent_id");