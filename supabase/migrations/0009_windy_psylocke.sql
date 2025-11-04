ALTER TABLE "depositLimits" ALTER COLUMN "monthly" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "depositLimits" ALTER COLUMN "weekly" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "depositLimits" ALTER COLUMN "daily" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "address" jsonb DEFAULT 'null'::jsonb;