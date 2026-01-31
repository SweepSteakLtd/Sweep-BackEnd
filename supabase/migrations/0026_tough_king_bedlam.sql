ALTER TABLE "Player" ADD COLUMN "external_ids" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "Player" DROP COLUMN "external_id";