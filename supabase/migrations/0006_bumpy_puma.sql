ALTER TABLE "Users" ADD COLUMN "nickname" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "is_self_excluded" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "exclusion_ending" timestamp;