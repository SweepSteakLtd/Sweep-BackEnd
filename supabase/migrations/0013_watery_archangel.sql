ALTER TABLE "Tournament" ALTER COLUMN "sport" SET DEFAULT 'Golf';--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "deposit_limit" jsonb DEFAULT '{"daily":null,"weekly":null,"monthly":null}'::jsonb;--> statement-breakpoint
ALTER TABLE "Users" DROP COLUMN "deposit_id";