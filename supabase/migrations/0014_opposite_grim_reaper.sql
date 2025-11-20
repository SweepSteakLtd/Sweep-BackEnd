ALTER TABLE "Tournament"
DROP COLUMN IF EXISTS "datagolf_id";
ALTER TABLE "Tournament"
DROP COLUMN IF EXISTS "external_id";
ALTER TABLE "Tournament" ADD COLUMN "external_id" text;