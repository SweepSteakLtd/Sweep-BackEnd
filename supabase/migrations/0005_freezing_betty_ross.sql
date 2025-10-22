ALTER TABLE "Game" ADD COLUMN "is_featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Game" ADD COLUMN "type" text DEFAULT 'public';