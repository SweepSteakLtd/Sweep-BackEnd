import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const bet = pgTable("Bet", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	gameId: text("game_id").notNull(),
	playerId: text("player_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const game = pgTable("Game", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text().default('),
	entryFee: integer("entry_fee").notNull(),
	contactPhone: text("contact_phone").default('),
	contactEmail: text("contact_email").default('),
	contactVisibility: boolean("contact_visibility").default(false),
	joinCode: text("join_code").default('),
	maxParticipants: integer("max_participants").default(100),
	rewards: jsonb().default([]),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	ownerId: text("owner_id").notNull(),
	tournamentId: text("tournament_id").notNull(),
	userIdList: text("user_id_list").array().default([""]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const playerProfile = pgTable("PlayerProfile", {
	id: text().primaryKey().notNull(),
	externalId: text("external_id").default('),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	country: text().notNull(),
	age: integer().notNull(),
	ranking: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const player = pgTable("Player", {
	id: text().primaryKey().notNull(),
	externalId: text("external_id").notNull(),
	level: integer().notNull(),
	currentScore: integer("current_score").default(0),
	position: integer().default(0),
	attempts: jsonb().default([]),
	missedCut: boolean("missed_cut").default(false),
	odds: integer().default(0),
	profileId: text("profile_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const tournament = pgTable("Tournament", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	startsAt: timestamp("starts_at", { mode: 'string' }).notNull(),
	finishesAt: timestamp("finishes_at", { mode: 'string' }).notNull(),
	description: text().default('),
	url: text().default('),
	coverPicture: text("cover_picture").default('),
	gallery: text().array().default([""]),
	holes: jsonb().default([]),
	ads: jsonb().default([]),
	proposedEntryFee: integer("proposed_entry_fee").notNull(),
	maximumCutAmount: integer("maximum_cut_amount").notNull(),
	maximumScoreGenerator: integer("maximum_score_generator").notNull(),
	players: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const transaction = pgTable("Transaction", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	value: text().notNull(),
	type: text().notNull(),
	chargeId: text("charge_id").default('),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("Users", {
	id: text().primaryKey().notNull(),
	firstName: text("first_name").default('),
	lastName: text("last_name").default('),
	email: text().notNull(),
	bio: text().default('),
	profilePicture: text("profile_picture").default('),
	phoneNumber: text("phone_number").default('),
	gameStopId: text("game_stop_id").default('),
	isAuthVerified: boolean("is_auth_verified").default(false),
	isIdentityVerified: boolean("is_identity_verified").default(false),
	depositLimit: integer("deposit_limit").default(0),
	bettingLimit: integer("betting_limit").default(0),
	paymentId: text("payment_id").default('),
	currentBalance: integer("current_balance").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});
