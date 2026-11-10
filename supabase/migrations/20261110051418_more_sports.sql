ALTER TYPE "public"."sport_type" ADD VALUE 'TRAIL';--> statement-breakpoint
ALTER TYPE "public"."sport_type" ADD VALUE 'HIKING';--> statement-breakpoint
ALTER TYPE "public"."sport_type" ADD VALUE 'SWIMMING';--> statement-breakpoint
ALTER TABLE "workout_slots" DROP CONSTRAINT "workout_slots_distance_max";--> statement-breakpoint
ALTER TABLE "workout_slots" ADD CONSTRAINT "workout_slots_distance_max" CHECK ("workout_slots"."distance_km" <= 1000);