import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Interface types for complex objects
export interface PlayerAttemptData {
  day: string;
  hole_id: string;
  hole_name: string;
  par: number;
  attempt: number;
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

export interface Address {
  line1: string;
  line2: string;
  line3?: string;
  town: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface TournamentColours {
  primary?: string;
  secondary?: string;
  highlight?: string;
}

interface DepositLimit {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
}

export interface PlayerExternalIds {
  datagolf?: number;
  liveGolfData?: string;
  [provider: string]: number | string | undefined;
}

// Main Tables
export const users = pgTable('Users', {
  id: text('id').primaryKey().notNull(), // required
  first_name: text('first_name').default(''), // optional, default ""
  last_name: text('last_name').default(''), // optional, default ""
  nickname: text('nickname').default(''),
  email: text('email').notNull(), // required
  date_of_birth: text('date_of_birth').default(null), // optional, default null
  bio: text('bio').default(''), // optional, default ""
  profile_picture: text('profile_picture').default(''), // optional, default ""
  phone_number: text('phone_number').default(''), // optional, default ""
  game_stop_id: text('game_stop_id').default(''), // optional, default ""
  is_auth_verified: boolean('is_auth_verified').default(false), // optional, default false
  is_identity_verified: boolean('is_identity_verified').default(false), // optional, default false
  deposit_limit: jsonb('deposit_limit')
    .$type<DepositLimit>()
    .default({ daily: null, weekly: null, monthly: null }), // optional, default 0
  betting_limit: integer('betting_limit').default(0), // optional, default 0
  payment_id: text('payment_id').default(''), // optional, default ""
  current_balance: integer('current_balance').default(0), // optional, default 0
  is_admin: boolean('is_admin').default(false), // optional, default false
  kyc_completed: boolean('kyc_completed').default(false), // optional, default false
  kyc_instance_id: text('kyc_instance_id').default(''), // optional, default ""
  is_self_excluded: boolean('is_self_excluded').default(false),
  exclusion_ending: timestamp('exclusion_ending'),
  address: jsonb('address').$type<Address | null>().default(null),
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
  profile_picture: text('profile_picture').notNull(), // required
  group: text('group').default(''), // optional, default ""
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const players = pgTable('Player', {
  id: text('id').primaryKey().notNull(), // required
  external_ids: jsonb('external_ids').$type<PlayerExternalIds>().default({}), // optional, default {}
  level: integer('level').notNull(), // required
  current_score: integer('current_score').default(0), // optional, default 0
  position: integer('position').default(0), // optional, default 0
  attempts: jsonb('attempts').$type<PlayerAttemptData[]>().default([]), // optional, default []
  missed_cut: boolean('missed_cut').default(false), // optional, default false
  odds: integer('odds').default(0), // optional, default 0
  profile_id: text('profile_id').notNull(), // required
  tournament_id: text('tournament_id').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const tournamentAd = pgTable('TournamentAd', {
  id: text('id').primaryKey().notNull(), // required
  name: text('name').notNull(), // required
  description: text('description').default(''), // optional, default ""
  position: integer('position').notNull(), // required
  website: text('website').default(''), // optional, default ""
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const tournamentHole = pgTable('TournamentHole', {
  id: text('id').primaryKey().notNull(), // required
  name: text('name').notNull(), // required
  description: text('description').default(''), // optional, default ""
  position: integer('position').notNull(), // required
  cover_image: text('cover_image').default('').notNull(), // optional, default ""
  par: integer('par').notNull(), // required
  distance: integer('distance').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const tournaments = pgTable('Tournament', {
  id: text('id').primaryKey().notNull(), // required
  external_id: text('external_id').notNull(),
  name: text('name').notNull(), // required
  short_name: text('short_name').default(''), // optional, default ""
  starts_at: timestamp('starts_at').notNull(), // required
  finishes_at: timestamp('finishes_at').notNull(), // required
  description: text('description').default(''), // optional, default ""
  url: text('url').default(''), // optional, default ""
  cover_picture: text('cover_picture').default(''), // optional, default ""
  gallery: text('gallery').array().default([]), // optional, default []
  holes: text('holes').array().default([]), // optional, default []
  ads: text('ads').array().default([]), // optional, default []
  proposed_entry_fee: integer('proposed_entry_fee').notNull(), // required
  maximum_cut_amount: integer('maximum_cut_amount').notNull(), // required
  maximum_score_generator: integer('maximum_score_generator').notNull(), // required
  players: text('players').array().default([]).notNull(), // required
  colours: jsonb('colours').$type<TournamentColours>().default({}), // required
  sport: text('sport').notNull().default('Golf'), // required
  rules: text('rules').array().notNull(), // required
  instructions: text('instructions').array().default([]), // optional, default []
  course_name: text('course_name').default(''), // optional, default ""
  tour: text('tour').default('pga'), // optional, default "" => can be pga, euro, kft, opp, alt, major
  status: text('status').default('active'), // optional, default "active" => can be active, processing, finished, cancelled
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const leagues = pgTable('League', {
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
  is_featured: boolean('is_featured').default(false), // optional, default false
  type: text('type').default('public'), // optional, default "public"
  joined_players: text('joined_players').array().default([]),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const bets = pgTable('Bet', {
  id: text('id').primaryKey().notNull(), // required
  owner_id: text('owner_id').notNull(), // required
  league_id: text('league_id').notNull(), // required
  team_id: text('team_id').notNull(), // required
  amount: integer('amount').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const teams = pgTable('Team', {
  id: text('id').primaryKey().notNull(), // required
  owner_id: text('owner_id').notNull(), // required
  league_id: text('league_id').notNull(), // required
  name: text('name').default(null),
  position: text('position').default(null),
  player_ids: text('player_ids').array().default([]), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('Transaction', {
  id: text('id').primaryKey().notNull(), // required
  name: text('name').notNull(), // required
  value: integer('value').notNull(), // required
  type: text('type').notNull(), // required
  charge_id: text('charge_id').default(''), // optional, default ""
  user_id: text('user_id').notNull(), // required
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  // Paysafe-specific fields
  payment_status: text('payment_status').default('PENDING'), // PENDING, COMPLETED, FAILED, REFUNDED
  payment_handle_token: text('payment_handle_token'), // Token from frontend
  payment_method: text('payment_method'), // CARD, NETBANKING, etc.
  payment_error_code: text('payment_error_code'), // Error code if failed
  payment_error_message: text('payment_error_message'), // Error message
  idempotency_key: text('idempotency_key').unique(), // Prevent duplicate charges
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}), // Additional Paysafe response data
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

export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;

export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TournamentHole = typeof tournamentHole.$inferSelect;
export type TournamentAd = typeof tournamentAd.$inferSelect;

// Audit Log Table
export const auditLogs = pgTable('AuditLog', {
  id: text('id').primaryKey().notNull(),
  user_id: text('user_id'), // Can be null for system actions
  action: text('action').notNull(), // e.g., 'CREATE_BET', 'DELETE_USER', 'UPDATE_LEAGUE'
  entity_type: text('entity_type').notNull(), // e.g., 'bet', 'user', 'league'
  entity_id: text('entity_id').notNull(), // ID of the entity being acted upon
  old_values: jsonb('old_values').$type<Record<string, unknown>>().default({}),
  new_values: jsonb('new_values').$type<Record<string, unknown>>().default({}),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
