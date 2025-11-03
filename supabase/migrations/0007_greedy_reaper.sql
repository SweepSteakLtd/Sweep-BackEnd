ALTER TABLE "Game" RENAME TO "League";--> statement-breakpoint
ALTER TABLE "Bet" RENAME COLUMN "game_id" TO "league_id";