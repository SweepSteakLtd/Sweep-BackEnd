import {
  Game,
  Player,
  PlayerAttemptData,
  PlayerProfile,
  RewardSplitData,
  TournamentPlayerData,
  Transaction,
} from './index';

// Mock Player Profiles
export const mockPlayerProfiles: PlayerProfile[] = [
  {
    id: 'profile_1',
    external_id: 'ext_tiger_woods',
    first_name: 'Tiger',
    last_name: 'Woods',
    country: 'USA',
    age: 48,
    ranking: 1,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-20T10:00:00Z'),
  },
  {
    id: 'profile_2',
    external_id: 'ext_rory_mcilroy',
    first_name: 'Rory',
    last_name: 'McIlroy',
    country: 'Northern Ireland',
    age: 35,
    ranking: 2,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-20T10:00:00Z'),
  },
  {
    id: 'profile_3',
    external_id: 'ext_jon_rahm',
    first_name: 'Jon',
    last_name: 'Rahm',
    country: 'Spain',
    age: 29,
    ranking: 3,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-20T10:00:00Z'),
  },
];

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
    external_id: 'ext_tiger_woods',
    level: 95,
    current_score: -8,
    position: 1,
    attempts: mockPlayerAttempts,
    missed_cut: false,
    odds: 1.25,
    profile_id: 'profile_1',
    created_at: new Date('2024-01-10T00:00:00Z'),
    updated_at: new Date('2024-01-20T16:00:00Z'),
  },
  {
    id: 'player_2',
    external_id: 'ext_rory_mcilroy',
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
    created_at: new Date('2024-01-10T00:00:00Z'),
    updated_at: new Date('2024-01-20T16:00:00Z'),
  },
  {
    id: 'player_3',
    external_id: 'ext_jon_rahm',
    level: 90,
    current_score: -4,
    position: 3,
    attempts: [],
    missed_cut: false,
    odds: 1.45,
    profile_id: 'profile_3',
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

// Mock Games
export const mockGames: Game[] = [
  {
    id: 'game_1',
    name: 'Masters Fantasy League',
    description: 'Pick your favorite golfers for the Masters tournament',
    entry_fee: 25,
    contact_phone: '+1555123456',
    contact_email: 'admin@mastersfantasy.com',
    contact_visibility: true,
    join_code: 'MASTERS2024',
    max_participants: 50,
    rewards: mockRewardSplits,
    start_time: new Date('2024-04-11T08:00:00Z'),
    end_time: new Date('2024-04-14T18:00:00Z'),
    owner_id: 'user_1',
    tournament_id: 'tournament_1',
    user_id_list: ['user_1', 'user_2', 'user_3'],
    created_at: new Date('2024-03-01T00:00:00Z'),
    updated_at: new Date('2024-03-15T10:00:00Z'),
  },
  {
    id: 'game_2',
    name: 'Weekend Warriors Golf Pool',
    description: 'Casual betting pool for weekend golfers',
    entry_fee: 10,
    contact_phone: '',
    contact_email: 'pool@weekendwarriors.com',
    contact_visibility: false,
    join_code: 'WEEKEND24',
    max_participants: 20,
    rewards: mockRewardSplits.slice(0, 3),
    start_time: new Date('2024-05-16T08:00:00Z'),
    end_time: new Date('2024-05-19T18:00:00Z'),
    owner_id: 'user_2',
    tournament_id: 'tournament_2',
    user_id_list: ['user_2', 'user_3'],
    created_at: new Date('2024-04-01T00:00:00Z'),
    updated_at: new Date('2024-04-10T12:00:00Z'),
  },
  {
    id: 'game_3',
    name: 'Private Championship Pool',
    description: '',
    entry_fee: 50,
    contact_phone: '',
    contact_email: '',
    contact_visibility: false,
    join_code: '',
    max_participants: 100,
    rewards: [],
    start_time: new Date('2024-06-01T08:00:00Z'),
    end_time: new Date('2024-06-04T18:00:00Z'),
    owner_id: 'user_3',
    tournament_id: 'tournament_1',
    user_id_list: [],
    created_at: new Date('2024-05-01T00:00:00Z'),
    updated_at: new Date('2024-05-01T00:00:00Z'),
  },
];

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'txn_1',
    name: 'Entry Fee Payment',
    value: '25.00',
    type: 'debit',
    charge_id: 'ch_abc123def456',
    user_id: 'user_1',
    created_at: new Date('2024-04-10T14:30:00Z'),
    updated_at: new Date('2024-04-10T14:30:00Z'),
  },
  {
    id: 'txn_2',
    name: 'Account Deposit',
    value: '100.00',
    type: 'credit',
    charge_id: 'ch_def456ghi789',
    user_id: 'user_2',
    created_at: new Date('2024-04-08T10:15:00Z'),
    updated_at: new Date('2024-04-08T10:15:00Z'),
  },
  {
    id: 'txn_3',
    name: 'Winnings Payout',
    value: '150.00',
    type: 'credit',
    charge_id: 'ch_ghi789jkl012',
    user_id: 'user_1',
    created_at: new Date('2024-04-14T20:00:00Z'),
    updated_at: new Date('2024-04-14T20:00:00Z'),
  },
  {
    id: 'txn_4',
    name: 'Entry Fee Payment',
    value: '10.00',
    type: 'debit',
    charge_id: '',
    user_id: 'user_3',
    created_at: new Date('2024-05-15T08:45:00Z'),
    updated_at: new Date('2024-05-15T08:45:00Z'),
  },
  {
    id: 'txn_5',
    name: 'Refund Processing',
    value: '25.00',
    type: 'credit',
    charge_id: 'ch_jkl012mno345',
    user_id: 'user_2',
    created_at: new Date('2024-05-20T13:20:00Z'),
    updated_at: new Date('2024-05-20T13:20:00Z'),
  },
];

// Export all mocks as a single object for easy importing
export const mockData = {
  playerProfiles: mockPlayerProfiles,
  players: mockPlayers,
  tournaments: [],
  games: mockGames,
  bets: [],
  transactions: mockTransactions,
  playerAttempts: mockPlayerAttempts,
  tournamentPlayers: mockTournamentPlayers,
  rewardSplits: mockRewardSplits,
};

export const getMockPlayerById = (id: string): Player | undefined =>
  mockPlayers.find(player => player.id === id);

export const getMockGameById = (id: string): Game | undefined =>
  mockGames.find(game => game.id === id);

export const getMockTransactionsByUserId = (userId: string): Transaction[] =>
  mockTransactions.filter(transaction => transaction.user_id === userId);
