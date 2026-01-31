import {
  Player,
  PlayerAttemptData,
  RewardSplitData,
  TournamentPlayerData,
  Transaction,
} from './index';

// Mock Player Attempt Data
export const mockPlayerAttempts: PlayerAttemptData[] = [
  {
    day: '2024-01-15',
    hole_id: 'hole_1',
    hole_name: "The Eagle's Nest",
    par: 4,
    attempt: 3,
  },
  {
    day: '2024-01-15',
    hole_id: 'hole_2',
    hole_name: 'Water Hazard Challenge',
    par: 3,
    attempt: 4,
  },
  {
    day: '2024-01-16',
    hole_id: 'hole_3',
    hole_name: 'The Long Drive',
    par: 5,
    attempt: 5,
  },
];

// Mock Players
export const mockPlayers: Player[] = [
  {
    id: 'player_1',
    external_ids: { datagolf: 27644 },
    level: 95,
    current_score: -8,
    position: 1,
    attempts: mockPlayerAttempts,
    missed_cut: false,
    odds: 1.25,
    profile_id: 'profile_1',
    tournament_id: 'tournament_1',
    created_at: new Date('2024-01-10T00:00:00Z'),
    updated_at: new Date('2024-01-20T16:00:00Z'),
  },
  {
    id: 'player_2',
    external_ids: { datagolf: 10959 },
    level: 92,
    current_score: -6,
    position: 2,
    attempts: [
      {
        day: '2024-01-15',
        hole_id: 'hole_1',
        hole_name: "The Eagle's Nest",
        par: 4,
        attempt: 4,
      },
    ],
    missed_cut: false,
    odds: 1.7,
    profile_id: 'profile_2',
    tournament_id: 'tournament_1',
    created_at: new Date('2024-01-10T00:00:00Z'),
    updated_at: new Date('2024-01-20T16:00:00Z'),
  },
  {
    id: 'player_3',
    external_ids: { datagolf: 8793 },
    level: 90,
    current_score: -4,
    position: 3,
    attempts: [],
    missed_cut: false,
    odds: 1.45,
    profile_id: 'profile_3',
    tournament_id: 'tournament_1',
    created_at: new Date('2024-01-10T00:00:00Z'),
    updated_at: new Date('2024-01-20T16:00:00Z'),
  },
]; //

// Mock Tournament Player Data
export const mockTournamentPlayers: TournamentPlayerData[] = [
  {
    id: 'player_1',
    level: 1,
  },
  {
    id: 'player_2',
    level: 2,
  },
  {
    id: 'player_3',
    level: 3,
  },
];

// Mock Reward Split Data
export const mockRewardSplits: RewardSplitData[] = [
  {
    position: 1,
    percentage: 40,
    type: 'cash',
    product_id: 'reward_cash_1st',
  },
  {
    position: 2,
    percentage: 25,
    type: 'cash',
    product_id: 'reward_cash_2nd',
  },
  {
    position: 3,
    percentage: 15,
    type: 'cash',
    product_id: 'reward_cash_3rd',
  },
  {
    position: 4,
    percentage: 10,
    type: 'merchandise',
    product_id: 'reward_merch_4th',
  },
  {
    position: 5,
    percentage: 10,
    type: 'merchandise',
    product_id: 'reward_merch_5th',
  },
];

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'txn_1',
    name: 'Entry Fee Payment',
    value: 25.0,
    type: 'debit',
    charge_id: 'ch_abc123def456',
    user_id: 'user_1',
    created_at: new Date('2024-04-10T14:30:00Z'),
    updated_at: new Date('2024-04-10T14:30:00Z'),
    payment_status: 'PENDING',
    payment_handle_token: null,
    payment_method: null,
    payment_error_code: null,
    payment_error_message: null,
    idempotency_key: null,
    metadata: {},
  },
  {
    id: 'txn_2',
    name: 'Account Deposit',
    value: 100.0,
    type: 'credit',
    charge_id: 'ch_def456ghi789',
    user_id: 'user_2',
    created_at: new Date('2024-04-08T10:15:00Z'),
    updated_at: new Date('2024-04-08T10:15:00Z'),
    payment_status: 'PENDING',
    payment_handle_token: null,
    payment_method: null,
    payment_error_code: null,
    payment_error_message: null,
    idempotency_key: null,
    metadata: {},
  },
  {
    id: 'txn_3',
    name: 'Winnings Payout',
    value: 15000,
    type: 'credit',
    charge_id: 'ch_ghi789jkl012',
    user_id: 'user_1',
    created_at: new Date('2024-04-14T20:00:00Z'),
    updated_at: new Date('2024-04-14T20:00:00Z'),
    payment_status: 'PENDING',
    payment_handle_token: null,
    payment_method: null,
    payment_error_code: null,
    payment_error_message: null,
    idempotency_key: null,
    metadata: {},
  },
  {
    id: 'txn_4',
    name: 'Entry Fee Payment',
    value: 1000,
    type: 'debit',
    charge_id: '',
    user_id: 'user_3',
    created_at: new Date('2024-05-15T08:45:00Z'),
    updated_at: new Date('2024-05-15T08:45:00Z'),
    payment_status: 'PENDING',
    payment_handle_token: null,
    payment_method: null,
    payment_error_code: null,
    payment_error_message: null,
    idempotency_key: null,
    metadata: {},
  },
  {
    id: 'txn_5',
    name: 'Refund Processing',
    value: 2500,
    type: 'credit',
    charge_id: 'ch_jkl012mno345',
    user_id: 'user_2',
    created_at: new Date('2024-05-20T13:20:00Z'),
    updated_at: new Date('2024-05-20T13:20:00Z'),
    payment_status: 'PENDING',
    payment_handle_token: null,
    payment_method: null,
    payment_error_code: null,
    payment_error_message: null,
    idempotency_key: null,
    metadata: {},
  },
];

// Export all mocks as a single object for easy importing
export const mockData = {
  players: mockPlayers,
  tournaments: [],
  games: [],
  bets: [],
  transactions: mockTransactions,
  playerAttempts: mockPlayerAttempts,
  tournamentPlayers: mockTournamentPlayers,
  rewardSplits: mockRewardSplits,
};

export const getMockPlayerById = (id: string): Player | undefined =>
  mockPlayers.find(player => player.id === id);

export const getMockTransactionsByUserId = (userId: string): Transaction[] =>
  mockTransactions.filter(transaction => transaction.user_id === userId);
