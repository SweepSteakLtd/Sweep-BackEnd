ALTER TABLE "PlayerProfile"
DROP COLUMN IF EXISTS "profile_picture";
ALTER TABLE "PlayerProfile" ADD COLUMN "profile_picture" text;