CREATE TABLE "club_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"types" text[] NOT NULL,
	"city" text NOT NULL,
	"description" text NOT NULL,
	"schedule" text[] DEFAULT '{}'::text[] NOT NULL,
	"meeting_place" text,
	"website" text,
	"facebook" text,
	"instagram" text,
	"strava" text,
	"email" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"submitted_by" uuid DEFAULT auth.uid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_submissions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "club_submissions_slug_format" CHECK ("club_submissions"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length("club_submissions"."slug") between 3 and 80),
	CONSTRAINT "club_submissions_name_length" CHECK (char_length("club_submissions"."name") between 3 and 80),
	CONSTRAINT "club_submissions_types" CHECK (cardinality("club_submissions"."types") between 1 and 3 and "club_submissions"."types" <@ array['RUNNING', 'TRIATHLON', 'CYCLING', 'SWIMMING', 'HIKING']::text[]),
	CONSTRAINT "club_submissions_city_length" CHECK (char_length("club_submissions"."city") between 2 and 40),
	CONSTRAINT "club_submissions_description_length" CHECK (char_length("club_submissions"."description") between 20 and 600),
	CONSTRAINT "club_submissions_schedule" CHECK (cardinality("club_submissions"."schedule") <= 5 and char_length(array_to_string("club_submissions"."schedule", '')) <= 600),
	CONSTRAINT "club_submissions_meeting_place_length" CHECK (char_length("club_submissions"."meeting_place") <= 120),
	CONSTRAINT "club_submissions_links" CHECK (("club_submissions"."website" is null or "club_submissions"."website" ~ '^https://[^\s]{4,200}$')
        and ("club_submissions"."facebook" is null or "club_submissions"."facebook" ~ '^https://[^\s]{4,200}$')
        and ("club_submissions"."instagram" is null or "club_submissions"."instagram" ~ '^https://[^\s]{4,200}$')
        and ("club_submissions"."strava" is null or "club_submissions"."strava" ~ '^https://[^\s]{4,200}$')),
	CONSTRAINT "club_submissions_email_format" CHECK ("club_submissions"."email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length("club_submissions"."email") <= 254),
	CONSTRAINT "club_submissions_location" CHECK ("club_submissions"."lat" between 53.8 and 56.5 and "club_submissions"."lng" between 20.9 and 26.9),
	CONSTRAINT "club_submissions_status" CHECK ("club_submissions"."status" in ('PENDING', 'APPROVED', 'REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid DEFAULT auth.uid(),
	"subject" text NOT NULL,
	"path" text NOT NULL,
	"target_id" text,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"reporter_name" text,
	"reporter_email" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_reports_subject_length" CHECK (char_length("content_reports"."subject") between 1 and 300),
	CONSTRAINT "content_reports_path_format" CHECK ("content_reports"."path" ~ '^/[A-Za-z0-9/_.-]{0,200}$'),
	CONSTRAINT "content_reports_target_length" CHECK (char_length("content_reports"."target_id") <= 100),
	CONSTRAINT "content_reports_reason" CHECK ("content_reports"."reason" in ('SPAM', 'ABUSE', 'DANGER', 'PRIVACY', 'COPYRIGHT', 'ILLEGAL', 'OTHER')),
	CONSTRAINT "content_reports_details_length" CHECK (char_length("content_reports"."details") between 10 and 2000),
	CONSTRAINT "content_reports_name_length" CHECK (char_length("content_reports"."reporter_name") between 2 and 120),
	CONSTRAINT "content_reports_email_format" CHECK ("content_reports"."reporter_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length("content_reports"."reporter_email") <= 254),
	CONSTRAINT "content_reports_status" CHECK ("content_reports"."status" in ('NEW', 'ACTIONED', 'DISMISSED'))
);
--> statement-breakpoint
ALTER TABLE "club_submissions" ADD CONSTRAINT "club_submissions_submitted_by_profiles_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_submissions_status_idx" ON "club_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "club_submissions_submitted_by_idx" ON "club_submissions" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "content_reports_status_created_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "content_reports_reporter_idx" ON "content_reports" USING btree ("reporter_id");