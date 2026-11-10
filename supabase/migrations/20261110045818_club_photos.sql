CREATE TABLE "club_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_slug" text NOT NULL,
	"author_id" uuid NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_photos_slug_format" CHECK ("club_photos"."club_slug" ~ '^[a-z0-9-]{3,80}$'),
	CONSTRAINT "club_photos_path_own_folder" CHECK ("club_photos"."path" ~ ('^' || "club_photos"."author_id"::text || '/' || "club_photos"."club_slug" || '/[0-9a-f-]{36}\.(webp|jpg)$'))
);
--> statement-breakpoint
ALTER TABLE "club_photos" ADD CONSTRAINT "club_photos_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_photos_club_created_idx" ON "club_photos" USING btree ("club_slug","created_at");--> statement-breakpoint
CREATE INDEX "club_photos_author_idx" ON "club_photos" USING btree ("author_id");