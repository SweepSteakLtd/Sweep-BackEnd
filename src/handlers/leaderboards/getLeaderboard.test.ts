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

// Empty leaderboard test
test('getLeaderboardHandler - returns empty array when no bets exist', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { league_id: 'league_abc123' } } as unknown as Request;

  const league = {
    id: 'league_abc123',
    name: 'Test League',
    entry_fee: 100,
    rewards: [],
  };

  // Mock: league exists, but no bets
  mockDatabaseCalls([
    [league], // league query
    [], // bets query (empty)
  ]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: [] });
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
  };

  const bets = [
    { id: 'bet1', owner_id: 'u1', league_id: 'league_abc123', team_id: 'team1', amount: 100 },
    { id: 'bet2', owner_id: 'u2', league_id: 'league_abc123', team_id: 'team2', amount: 100 },
  ];

  const teams = [
    { id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: ['p1', 'p2'] },
    { id: 'team2', owner_id: 'u2', name: 'Team Beta', player_ids: ['p3', 'p4'] },
  ];

  const owners = [
    { id: 'u1', first_name: 'John', last_name: 'Smith' },
    { id: 'u2', first_name: 'Jane', last_name: 'Doe' },
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

  const profiles = [
    { id: 'profile1', first_name: 'Tiger', last_name: 'Woods' },
    { id: 'profile2', first_name: 'Rory', last_name: 'McIlroy' },
    { id: 'profile3', first_name: 'Phil', last_name: 'Mickelson' },
    { id: 'profile4', first_name: 'Justin', last_name: 'Thomas' },
  ];

  // Mock all database calls in order
  mockDatabaseCalls([
    [league], // league query
    bets, // bets query
    teams, // teams query
    owners, // team owners query
    players, // players query
    profiles, // player profiles query
  ]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.arrayContaining([
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
          prize: '$100.00',
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
          prize: '$60.00',
        }),
      ]),
    }),
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
  };

  const bets = [
    { id: 'bet1', owner_id: 'u1', league_id: 'league_abc123', team_id: 'team1', amount: 100 },
  ];

  const teams = [{ id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: ['p1'] }];

  const owners = [{ id: 'u1', first_name: 'John', last_name: 'Smith' }];

  const players = [
    {
      id: 'p1',
      profile_id: 'profile1',
      level: 1,
      current_score: 0,
      missed_cut: true,
    },
  ];

  const profiles = [{ id: 'profile1', first_name: 'Tiger', last_name: 'Woods' }];

  mockDatabaseCalls([[league], bets, teams, owners, players, profiles]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];
  expect(response.data[0].players[0].status).toBe('MC');
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
  };

  const bets = [
    { id: 'bet1', owner_id: 'u1', league_id: 'league_abc123', team_id: 'team1', amount: 100 },
  ];

  const teams = [{ id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: [] }];

  const owners = [{ id: 'u1', first_name: 'John', last_name: 'Smith' }];

  // Mock: league, bets, teams, owners (no players)
  mockDatabaseCalls([[league], bets, teams, owners]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.arrayContaining([
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
    }),
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
  };

  const bets = [
    { id: 'bet1', owner_id: 'u1', league_id: 'league_abc123', team_id: 'team1', amount: 100 },
    { id: 'bet2', owner_id: 'u2', league_id: 'league_abc123', team_id: 'team2', amount: 100 },
    { id: 'bet3', owner_id: 'u3', league_id: 'league_abc123', team_id: 'team3', amount: 100 },
  ];

  const teams = [
    { id: 'team1', owner_id: 'u1', name: 'Team Alpha', player_ids: [] },
    { id: 'team2', owner_id: 'u2', name: 'Team Beta', player_ids: [] },
    { id: 'team3', owner_id: 'u3', name: 'Team Gamma', player_ids: [] },
  ];

  const owners = [
    { id: 'u1', first_name: '', last_name: '' }, // Empty names
    { id: 'u2', first_name: 'Jane', last_name: '' }, // Missing last name
    // u3 not in owners array - owner not found
  ];

  mockDatabaseCalls([[league], bets, teams, owners]);

  await getLeaderboardHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const response = (res.send as jest.Mock).mock.calls[0][0];

  // Team1 should have "Unknown Owner" (empty names)
  const team1 = response.data.find((t: any) => t.name.main === 'Team Alpha');
  expect(team1.name.substring).toBe('Unknown Owner');

  // Team2 should have "Jane" (only first name)
  const team2 = response.data.find((t: any) => t.name.main === 'Team Beta');
  expect(team2.name.substring).toBe('Jane');

  // Team3 should have "Unknown Owner" (owner not found)
  const team3 = response.data.find((t: any) => t.name.main === 'Team Gamma');
  expect(team3.name.substring).toBe('Unknown Owner');
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
