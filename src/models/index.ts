import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Interface types for complex objects
export interface PlayerAttemptData {
  day: string;
  hole_id: string;
  hole_name: string;
  par: number;
  attempt: number;
}

export interface TournamentHoleData {
  id: string;
  name: string;
  description: string;
  position: number;
  cover_image: string;
  par: number;
  distance: number;
}

export interface TournamentAdsData {
  id: string;
  name: string;
  description: string;
  position: number;
  website: string;
}

export interface TournamentPlayerData {
  id: string;
  level: number;
}

export interface RewardSplitData {
  position: number;
  percentage: number;
  type: string;
  product_id: string;
}

// Main Tables
export const users = pgTable('Users', {
  id: text('id').primaryKey().notNull(), // required
  first_name: text('first_name').default(''), // optional, default ""
  last_name: text('last_name').default(''), // optional, default ""
  email: text('email').notNull(), // required
  bio: text('bio').default(''), // optional, default ""
  profile_picture: text('profile_picture').default(''), // optional, default ""
  phone_number: text('phone_number').default(''), // optional, default ""
  game_stop_id: text('game_stop_id').default(''), // optional, default ""
  is_auth_verified: boolean('is_auth_verified').default(false), // optional, default false
  is_identity_verified: boolean('is_identity_verified').default(false), // optional, default false
  deposit_limit: integer('deposit_limit').default(0), // optional, default 0
  betting_limit: integer('betting_limit').default(0), // optional, default 0
  payment_id: text('payment_id').default(''), // optional, default ""
  current_balance: integer('current_balance').default(0), // optional, default 0
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const playerProfiles = pgTable('PlayerProfile', {
  id: text('id').primaryKey().notNull(), // required
  external_id: text('external_id').default(''), // optional, default ""
  first_name: text('first_name').notNull(), // required
  last_name: text('last_name').notNull(), // required
  country: text('country').notNull(), // required
  age: integer('age').notNull(), // required
  ranking: integer('ranking').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const players = pgTable('Player', {
  id: text('id').primaryKey().notNull(), // required
  external_id: text('external_id').notNull(), // required
  level: integer('level').notNull(), // required
  current_score: integer('current_score').default(0), // optional, default 0
  position: integer('position').default(0), // optional, default 0
  attempts: jsonb('attempts').$type<PlayerAttemptData[]>().default([]), // optional, default []
  missed_cut: boolean('missed_cut').default(false), // optional, default false
  odds: integer('odds').default(0), // optional, default 0
  profile_id: text('profile_id').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const tournaments = pgTable('Tournament', {
  id: text('id').primaryKey().notNull(), // required
  name: text('name').notNull(), // required
  starts_at: timestamp('starts_at').notNull(), // required
  finishes_at: timestamp('finishes_at').notNull(), // required
  description: text('description').default(''), // optional, default ""
  url: text('url').default(''), // optional, default ""
  cover_picture: text('cover_picture').default(''), // optional, default ""
  gallery: text('gallery').array().default([]), // optional, default []
  holes: jsonb('holes').$type<TournamentHoleData[]>().default([]), // optional, default []
  ads: jsonb('ads').$type<TournamentAdsData[]>().default([]), // optional, default []
  proposed_entry_fee: integer('proposed_entry_fee').notNull(), // required
  maximum_cut_amount: integer('maximum_cut_amount').notNull(), // required
  maximum_score_generator: integer('maximum_score_generator').notNull(), // required
  players: jsonb('players').$type<TournamentPlayerData[]>().notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const games = pgTable('Game', {
  id: text('id').primaryKey().notNull(), // required
  name: text('name').notNull(), // required
  description: text('description').default(''), // optional, default ""
  entry_fee: integer('entry_fee').notNull(), // required
  contact_phone: text('contact_phone').default(''), // optional, default ""
  contact_email: text('contact_email').default(''), // optional, default ""
  contact_visibility: boolean('contact_visibility').default(false), // optional, default false
  join_code: text('join_code').default(''), // optional, default ""
  max_participants: integer('max_participants').default(100), // optional, default 100
  rewards: jsonb('rewards').$type<RewardSplitData[]>().default([]), // optional, default []
  start_time: timestamp('start_time').notNull(), // required
  end_time: timestamp('end_time').notNull(), // required
  owner_id: text('owner_id').notNull(), // required
  tournament_id: text('tournament_id').notNull(), // required
  user_id_list: text('user_id_list').array().default([]), // optional, default []
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const bets = pgTable('Bet', {
  id: text('id').primaryKey().notNull(), // required
  owner_id: text('owner_id').notNull(), // required
  game_id: text('game_id').notNull(), // required
  player_id: text('player_id').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('Transaction', {
  id: text('id').primaryKey().notNull(), // required
  name: text('name').notNull(), // required
  value: text('value').notNull(), // required
  type: text('type').notNull(), // required
  charge_id: text('charge_id').default(''), // optional, default ""
  user_id: text('user_id').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Export types for use in the application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type NewPlayerProfile = typeof playerProfiles.$inferInsert;

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
