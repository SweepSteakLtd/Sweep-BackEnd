CREATE TABLE "TournamentAd" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"position" integer NOT NULL,
	"website" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TournamentHole" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"position" integer NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"par" integer NOT NULL,
	"distance" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Tournament" DROP COLUMN "holes";
ALTER TABLE "Tournament" ADD COLUMN holes text[];--> statement-breakpoint
ALTER TABLE "Tournament" ALTER COLUMN "holes" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "Tournament" DROP COLUMN "ads";
ALTER TABLE "Tournament" ADD COLUMN ads text[];--> statement-breakpoint
ALTER TABLE "Tournament" ALTER COLUMN "ads" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "Tournament" DROP COLUMN "players";
ALTER TABLE "Tournament" ADD COLUMN players text[];--> statement-breakpoint
ALTER TABLE "Tournament" ALTER COLUMN "players" SET DEFAULT '{}';
