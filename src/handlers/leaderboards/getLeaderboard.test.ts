jest.mock('../../services');

import { Request, Response } from 'express';
import { database } from '../../services';
import { getLeaderboardHandler } from './getLeaderboard';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

afterEach(() => jest.resetAllMocks());

// Helper to mock chained database calls
const mockDatabaseCalls = (results: any[]) => {
  let callIndex = 0;
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => ({
          execute: async () => {
            const result = results[callIndex];
            callIndex++;
            return result;
          },
        }),
        execute: async () => {
          const result = results[callIndex];
          callIndex++;
          return result;
        },
      }),
      execute: async () => {
        const result = results[callIndex];
        callIndex++;
        return result;
      },
    }),
  }));
};

// Parameter validation tests
test('getLeaderboardHandler - returns 422 when league_id missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: {} } as unknown as Request;

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required parameter: league_id',
    }),
  );
});

test('getLeaderboardHandler - returns 422 when league_id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: '   ' } } as unknown as Request;

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'league_id must be a non-empty string',
    }),
  );
});

// League not found test
test('getLeaderboardHandler - returns 404 when league not found', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_nonexistent' } } as unknown as Request;

  // Mock league not found
  mockDatabaseCalls([[]]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Not found',
      message: 'League not found',
    }),
  );
});

// Tournament not found test
test('getLeaderboardHandler - returns 404 when tournament not found', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_nonexistent',
  };

  // Mock league found, but tournament not found
  mockDatabaseCalls([
    [league], // league query
    [], // tournament query (empty)
  ]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Not found',
      message: 'Tournament not found',
    }),
  );
});

// Empty leaderboard test
test('getLeaderboardHandler - returns empty array when no teams exist', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: new Date(),
  };

  // Mock: league exists, tournament exists, but no teams
  mockDatabaseCalls([
    [league], // league query
    [tournament], // tournament query
    [], // teams query (empty)
  ]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data).toHaveProperty('entries');
  expect(response.data).toHaveProperty('total_pot');
  expect(response.data).toHaveProperty('round');
  expect(response.data.entries).toEqual([]);
  expect(response.data.total_pot).toBe(0);
  expect(response.data.round).toBe('1/4');
});

// Success case with leaderboard data
test('getLeaderboardHandler - returns leaderboard with teams and players', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [
      { position: 1, percentage: 50, type: 'cash', product_id: '' },
      { position: 2, percentage: 30, type: 'cash', product_id: '' },
    ],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: new Date(),
  };

  const teams = [
    { id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: ['profile1', 'profile2'], league_id: 'league_abc123' },
    { id: 'team2', owner_id: 'u2', name: 'Team Beta', player_ids: ['profile3', 'profile4'], league_id: 'league_abc123' },
  ];

  const owners = [
    { id: 'u1', first_name: 'John', last_name: 'Smith' },
    { id: 'u2', first_name: 'Jane', last_name: 'Doe' },
  ];

  const profiles = [
    { id: 'profile1', first_name: 'Tiger', last_name: 'Woods', group: 'A' },
    { id: 'profile2', first_name: 'Rory', last_name: 'McIlroy', group: 'B' },
    { id: 'profile3', first_name: 'Phil', last_name: 'Mickelson', group: 'A' },
    { id: 'profile4', first_name: 'Justin', last_name: 'Thomas', group: 'B' },
  ];

  const players = [
    {
      id: 'p1',
      profile_id: 'profile1',
      level: 1,
      current_score: -10,
      missed_cut: false,
    },
    {
      id: 'p2',
      profile_id: 'profile2',
      level: 2,
      current_score: -14,
      missed_cut: false,
    },
    {
      id: 'p3',
      profile_id: 'profile3',
      level: 1,
      current_score: -8,
      missed_cut: false,
    },
    {
      id: 'p4',
      profile_id: 'profile4',
      level: 2,
      current_score: -9,
      missed_cut: false,
    },
  ];

  // Mock all database calls in order
  mockDatabaseCalls([
    [league], // league query
    [tournament], // tournament query
    teams, // teams query
    owners, // team owners query
    profiles, // player profiles query
    players, // players query
  ]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data).toHaveProperty('entries');
  expect(response.data).toHaveProperty('total_pot');
  expect(response.data).toHaveProperty('round');
  expect(response.data.total_pot).toBe(180); // 2 teams * 100 entry fee * 0.9
  expect(response.data.round).toBe('1/4'); // Tournament starts today, so round 1/4
  expect(response.data.entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        rank: 1,
        name: expect.objectContaining({
          main: 'Team Alpha',
          substring: 'John Smith',
        }),
        total: -24,
        players: expect.arrayContaining([
          expect.objectContaining({
            group: 'A',
            player_name: 'Tiger Woods',
            score: -10,
            status: 'F',
          }),
          expect.objectContaining({
            group: 'B',
            player_name: 'Rory McIlroy',
            score: -14,
            status: 'F',
          }),
        ]),
        bestScore: [-14, -10],
        prize: 9000, // 180 * 50
      }),
      expect.objectContaining({
        rank: 2,
        name: expect.objectContaining({
          main: 'Team Beta',
          substring: 'Jane Doe',
        }),
        total: -17,
        players: expect.arrayContaining([
          expect.objectContaining({
            group: 'A',
            player_name: 'Phil Mickelson',
            score: -8,
          }),
          expect.objectContaining({
            group: 'B',
            player_name: 'Justin Thomas',
            score: -9,
          }),
        ]),
        bestScore: [-9, -8],
        prize: 5400, // 180 * 30
      }),
    ]),
  );
});

// Test with missed cut player
test('getLeaderboardHandler - handles missed cut status correctly', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: new Date(),
  };

  const teams = [{ id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: ['profile1'], league_id: 'league_abc123' }];

  const owners = [{ id: 'u1', first_name: 'John', last_name: 'Smith' }];

  const profiles = [{ id: 'profile1', first_name: 'Tiger', last_name: 'Woods', group: 'A' }];

  const players = [
    {
      id: 'p1',
      profile_id: 'profile1',
      level: 1,
      current_score: 0,
      missed_cut: true,
    },
  ];

  mockDatabaseCalls([[league], [tournament], teams, owners, profiles, players]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data.entries[0].players[0].status).toBe('MC');
});

// Test with no player profiles
test('getLeaderboardHandler - handles teams with no players', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: new Date(),
  };

  const teams = [{ id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: [], league_id: 'league_abc123' }];

  const owners = [{ id: 'u1', first_name: 'John', last_name: 'Smith' }];

  // Mock: league, tournament, teams, owners (no players)
  mockDatabaseCalls([[league], [tournament], teams, owners]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data.entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        rank: 1,
        name: expect.objectContaining({
          main: 'Team Alpha',
        }),
        total: 0,
        players: [],
        bestScore: [],
      }),
    ]),
  );
});

// Test with missing owner information
test('getLeaderboardHandler - handles missing or incomplete owner names', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: new Date(),
  };

  const teams = [
    { id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: [], league_id: 'league_abc123' },
    { id: 'team2', owner_id: 'u2', name: 'Team Beta', player_ids: [], league_id: 'league_abc123' },
    { id: 'team3', owner_id: 'u3', name: 'Team Gamma', player_ids: [], league_id: 'league_abc123' },
  ];

  const owners = [
    { id: 'u1', first_name: '', last_name: '' }, // Empty names
    { id: 'u2', first_name: 'Jane', last_name: '' }, // Missing last name
    // u3 not in owners array - owner not found
  ];

  mockDatabaseCalls([[league], [tournament], teams, owners]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];

  // Team1 should have "Unknown Owner" (empty names)
  const team1 = response.data.entries.find((t: any) => t.name.main === 'Team Alpha');
  expect(team1.name.substring).toBe('Unknown Owner');

  // Team2 should have "Jane" (only first name)
  const team2 = response.data.entries.find((t: any) => t.name.main === 'Team Beta');
  expect(team2.name.substring).toBe('Jane');

  // Team3 should have "Unknown Owner" (owner not found)
  const team3 = response.data.entries.find((t: any) => t.name.main === 'Team Gamma');
  expect(team3.name.substring).toBe('Unknown Owner');
});

// Test round calculation
test('getLeaderboardHandler - calculates correct round based on tournament start date', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  // Tournament started 2 days ago, so we should be in round 3
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: twoDaysAgo,
  };

  const teams = [{ id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: [], league_id: 'league_abc123' }];

  const owners = [{ id: 'u1', first_name: 'John', last_name: 'Smith' }];

  mockDatabaseCalls([[league], [tournament], teams, owners]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data.round).toBe('3/4'); // Day 0 = Round 1, Day 1 = Round 2, Day 2 = Round 3
});

// Test round at day 3 shows 4/4
test('getLeaderboardHandler - shows 4/4 for day 3', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  // Tournament started 3 days ago, should be round 4/4
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: threeDaysAgo,
  };

  const teams = [{ id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: [], league_id: 'league_abc123' }];

  const owners = [{ id: 'u1', first_name: 'John', last_name: 'Smith' }];

  mockDatabaseCalls([[league], [tournament], teams, owners]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data.round).toBe('4/4'); // Day 3 = Round 4
});

// Test tournament finished after 4+ days
test('getLeaderboardHandler - shows Tournament finished for tournaments beyond 4 days', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  // Tournament started 5 days ago, should show Tournament finished
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
    tournament_id: 'tournament_1',
  };

  const tournament = {
    id: 'tournament_1',
    starts_at: fiveDaysAgo,
  };

  const teams = [{ id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: [], league_id: 'league_abc123' }];

  const owners = [{ id: 'u1', first_name: 'John', last_name: 'Smith' }];

  mockDatabaseCalls([[league], [tournament], teams, owners]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data.round).toBe('Tournament finished'); // 5+ days = Tournament finished
});

// Error handling test
test('getLeaderboardHandler - returns 500 on database error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => ({
          execute: async () => {
            throw new Error('Database error');
          },
        }),
      }),
    }),
  }));

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
    }),
  );
});
