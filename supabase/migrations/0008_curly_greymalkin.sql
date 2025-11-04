CREATE TABLE "depositLimits" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text DEFAULT '' NOT NULL,
	"monthly" integer DEFAULT 0,
	"weekly" integer DEFAULT 0,
	"daily" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Users" RENAME COLUMN "deposit_limit" TO "deposit_id";