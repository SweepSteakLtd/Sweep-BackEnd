CREATE TABLE "Team" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"player_ids" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Bet" ADD COLUMN "team_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Bet" ADD COLUMN "amount" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "Bet" DROP COLUMN "player_id";