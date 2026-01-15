ALTER TABLE "Transaction" ADD COLUMN "payment_status" text DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "Transaction" ADD COLUMN "payment_handle_token" text;--> statement-breakpoint
ALTER TABLE "Transaction" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "Transaction" ADD COLUMN "payment_error_code" text;--> statement-breakpoint
ALTER TABLE "Transaction" ADD COLUMN "payment_error_message" text;--> statement-breakpoint
ALTER TABLE "Transaction" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "Transaction" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_idempotency_key_unique" UNIQUE("idempotency_key");