jest.mock('../../services', () => ({
  database: {
    select: jest.fn(),
  },
}));

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getLeagueByIdHandler } from './getLeagueById';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const mockLeague = {
  id: 'league_123',
  name: 'Test League',
  tournament_id: 'tournament_123',
  join_code: 'GOLF2025',
  entry_fee: 100,
  contact_phone: '+12345678901',
  contact_email: 'test@example.com',
  contact_visibility: true,
  max_participants: 50,
  rewards: [],
  start_time: new Date(),
  end_time: new Date(),
  type: 'public',
  user_id_list: [],
  owner_id: 'user_123',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockTournament = {
  id: 'tournament_123',
  name: 'Test Tournament',
  starts_at: new Date(),
  finishes_at: new Date(),
  description: 'Test description',
  url: 'https://example.com',
  cover_picture: null,
  gallery: [],
  holes: [],
  ads: [],
  proposed_entry_fee: 100,
  maximum_cut_amount: 1000,
  maximum_score_generator: 100,
  players: [],
  created_at: new Date(),
  updated_at: new Date(),
};

const mockTeams = [
  {
    id: 'team_123',
    league_id: 'league_123',
    owner_id: 'user_123',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'team_456',
    league_id: 'league_123',
    owner_id: 'user_456',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

afterEach(() => jest.resetAllMocks());

describe('getLeagueByIdHandler', () => {
  beforeEach(() => {
    const mockFrom = jest.fn();
    const mockWhere = jest.fn();
    const mockLimit = jest.fn();
    const mockExecute = jest.fn();

    mockExecute
      .mockResolvedValueOnce([mockLeague])
      .mockResolvedValueOnce([mockTournament])
      .mockResolvedValueOnce(mockTeams);

    mockLimit.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    (database.select as jest.Mock).mockReturnValue({ from: mockFrom });
  });

  test('successfully retrieves league by ID with join_code when user is owner', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_123' }; // Same as league owner_id
    const req = {
      params: { id: 'league_123' },
      query: {},
    } as unknown as Request;

    await getLeagueByIdHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    expect(sent.data.league.join_code).toBe('GOLF2025');
    expect(sent.data.tournament).toEqual(mockTournament);
    expect(sent.data.user_team_count).toBe(1); // user_123 owns team_123
    expect(sent.data.total_team_count).toBe(2);
    expect(sent.data.total_pot).toBe(18000); // 2 teams * 100 entry fee * 0.9 * 100
  });

  test('successfully retrieves league by ID without join_code when user is not owner', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_456' }; // Different from league owner_id
    const req = {
      params: { id: 'league_123' },
      query: {},
    } as unknown as Request;

    await getLeagueByIdHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    expect(sent.data.league.join_code).toBeUndefined();
    expect(sent.data.league.id).toBe('league_123');
    expect(sent.data.tournament).toEqual(mockTournament);
    expect(sent.data.user_team_count).toBe(1); // user_456 owns team_456
    expect(sent.data.total_team_count).toBe(2);
    expect(sent.data.total_pot).toBe(18000); // 2 teams * 100 entry fee * 0.9 * 100
  });

  test('returns 422 when id not provided', async () => {
    const res = mockResponse();
    const req = {
      params: {},
      query: {},
    } as unknown as Request;

    await getLeagueByIdHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Invalid request body',
      message: 'required properties missing',
    });
  });

  test('returns 403 when league not found', async () => {
    const mockFrom = jest.fn();
    const mockWhere = jest.fn();
    const mockLimit = jest.fn();
    const mockExecute = jest.fn().mockResolvedValue([]);

    mockLimit.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const res = mockResponse();
    const req = {
      params: { id: 'nonexistent_league' },
      query: {},
    } as unknown as Request;

    await getLeagueByIdHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Missing league',
      message: "league doesn't exist",
    });
  });

  test('returns 500 when database error occurs', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockFrom = jest.fn();
    const mockWhere = jest.fn();
    const mockLimit = jest.fn();
    const mockExecute = jest.fn().mockRejectedValue(new Error('Database error'));

    mockLimit.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const res = mockResponse();
    const req = {
      params: { id: 'league_123' },
      query: {},
    } as unknown as Request;

    await getLeagueByIdHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });

    consoleLogSpy.mockRestore();
  });
});
