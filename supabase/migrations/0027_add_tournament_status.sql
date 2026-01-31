ALTER TABLE "Tournament" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "Tournament" ADD CONSTRAINT "tournament_status_check" CHECK (status IN ('active', 'processing', 'finished', 'cancelled'));--> statement-breakpoint
CREATE INDEX idx_tournaments_status_finishes_at ON "Tournament" (status, finishes_at);--> statement-breakpoint
COMMENT ON COLUMN "Tournament"."status" IS 'Tournament status: active (not yet processed), processing (currently being processed), finished (completed), cancelled (cancelled tournament)';
