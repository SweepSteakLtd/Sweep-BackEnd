ALTER TABLE "Users" ADD COLUMN "kyc_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "kyc_instance_id" text DEFAULT '';