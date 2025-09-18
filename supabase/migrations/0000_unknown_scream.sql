CREATE TABLE "Bet" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Game" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"entry_fee" integer NOT NULL,
	"contact_phone" text DEFAULT '',
	"contact_email" text DEFAULT '',
	"contact_visibility" boolean DEFAULT false,
	"join_code" text DEFAULT '',
	"max_participants" integer DEFAULT 100,
	"rewards" jsonb DEFAULT '[]'::jsonb,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"owner_id" text NOT NULL,
	"tournament_id" text NOT NULL,
	"user_id_list" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PlayerProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text DEFAULT '',
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"country" text NOT NULL,
	"age" integer NOT NULL,
	"ranking" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Player" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"level" integer NOT NULL,
	"current_score" integer DEFAULT 0,
	"position" integer DEFAULT 0,
	"attempts" jsonb DEFAULT '[]'::jsonb,
	"missed_cut" boolean DEFAULT false,
	"odds" integer DEFAULT 0,
	"profile_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Tournament" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"finishes_at" timestamp NOT NULL,
	"description" text DEFAULT '',
	"url" text DEFAULT '',
	"cover_picture" text DEFAULT '',
	"gallery" text[] DEFAULT '{}',
	"holes" jsonb DEFAULT '[]'::jsonb,
	"ads" jsonb DEFAULT '[]'::jsonb,
	"proposed_entry_fee" integer NOT NULL,
	"maximum_cut_amount" integer NOT NULL,
	"maximum_score_generator" integer NOT NULL,
	"players" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"type" text NOT NULL,
	"charge_id" text DEFAULT '',
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Users" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text DEFAULT '',
	"last_name" text DEFAULT '',
	"email" text NOT NULL,
	"bio" text DEFAULT '',
	"profile_picture" text DEFAULT '',
	"phone_number" text DEFAULT '',
	"game_stop_id" text DEFAULT '',
	"is_auth_verified" boolean DEFAULT false,
	"is_identity_verified" boolean DEFAULT false,
	"deposit_limit" integer DEFAULT 0,
	"betting_limit" integer DEFAULT 0,
	"payment_id" text DEFAULT '',
	"current_balance" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
