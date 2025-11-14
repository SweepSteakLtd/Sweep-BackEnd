ALTER TABLE "Tournament" ADD COLUMN "colours" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "Tournament" ADD COLUMN "sport" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Tournament" ADD COLUMN "rules" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "Tournament" ADD COLUMN "instructions" text[] DEFAULT '{}';