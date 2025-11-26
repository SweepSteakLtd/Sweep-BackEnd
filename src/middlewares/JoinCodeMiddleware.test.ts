jest.mock('../services', () => ({
  database: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

import { NextFunction, Request, Response } from 'express';
import { database } from '../services';
import { JoinCodeMiddleware } from './JoinCodeMiddleware';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {
    user: {
      id: 'user_abc123',
      email: 'test@example.com',
    },
  };
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const mockPrivateLeague = {
  id: 'league_123',
  name: 'Test Private League',
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
  type: 'private',
  user_id_list: [],
  joined_players: [],
  owner_id: 'user_123',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockPublicLeague = {
  ...mockPrivateLeague,
  id: 'league_456',
  name: 'Test Public League',
  type: 'public',
  join_code: '',
};

afterEach(() => jest.resetAllMocks());

describe('JoinCodeMiddleware', () => {
  beforeEach(() => {
    const mockFrom = jest.fn();
    const mockWhere = jest.fn();
    const mockLimit = jest.fn();
    const mockExecute = jest.fn();

    mockLimit.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

    // Mock database update chain
    const mockUpdateExecute = jest.fn().mockResolvedValue(undefined);
    const mockUpdateWhere = jest.fn().mockReturnValue({ execute: mockUpdateExecute });
    const mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
    (database.update as jest.Mock).mockReturnValue({ set: mockSet });
  });

  describe('Private League Access', () => {
    test('allows access to private league with valid join_code and adds user to joined_players', async () => {
      const mockFrom = jest.fn();
      const mockWhere = jest.fn();
      const mockLimit = jest.fn();
      const mockExecute = jest.fn().mockResolvedValue([mockPrivateLeague]);

      mockLimit.mockReturnValue({ execute: mockExecute });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

      // Mock database update chain
      const mockUpdateExecute = jest.fn().mockResolvedValue(undefined);
      const mockUpdateWhere = jest.fn().mockReturnValue({ execute: mockUpdateExecute });
      const mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
      (database.update as jest.Mock).mockReturnValue({ set: mockSet });

      const res = mockResponse();
      const req = {
        params: { id: 'league_123' },
        query: { join_code: 'GOLF2025' },
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(res.locals.is_private_league).toBe(true);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(database.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
    });

    test('denies access to private league without join_code', async () => {
      const mockFrom = jest.fn();
      const mockWhere = jest.fn();
      const mockLimit = jest.fn();
      const mockExecute = jest.fn().mockResolvedValue([mockPrivateLeague]);

      mockLimit.mockReturnValue({ execute: mockExecute });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const res = mockResponse();
      const req = {
        params: { id: 'league_123' },
        query: {},
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'This is a private league. A valid join code is required to access it.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('skips update when user already in joined_players', async () => {
      const mockPrivateLeagueWithUser = {
        ...mockPrivateLeague,
        joined_players: ['user_abc123'],
      };

      const mockFrom = jest.fn();
      const mockWhere = jest.fn();
      const mockLimit = jest.fn();
      const mockExecute = jest.fn().mockResolvedValue([mockPrivateLeagueWithUser]);

      mockLimit.mockReturnValue({ execute: mockExecute });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const res = mockResponse();
      const req = {
        params: { id: 'league_123' },
        query: { join_code: 'GOLF2025' },
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(database.update).not.toHaveBeenCalled();
    });

    test('denies access to private league with invalid join_code', async () => {
      const mockFrom = jest.fn();
      const mockWhere = jest.fn();
      const mockLimit = jest.fn();
      const mockExecute = jest.fn().mockResolvedValue([mockPrivateLeague]);

      mockLimit.mockReturnValue({ execute: mockExecute });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const res = mockResponse();
      const req = {
        params: { id: 'league_123' },
        query: { join_code: 'INVALID_CODE' },
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid join code for this private league.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Public League Access', () => {
    test('allows access to public league without join_code', async () => {
      const mockFrom = jest.fn();
      const mockWhere = jest.fn();
      const mockLimit = jest.fn();
      const mockExecute = jest.fn().mockResolvedValue([mockPublicLeague]);

      mockLimit.mockReturnValue({ execute: mockExecute });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const res = mockResponse();
      const req = {
        params: { id: 'league_456' },
        query: {},
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(res.locals.is_private_league).toBe(false);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('allows access to public league with join_code', async () => {
      const mockFrom = jest.fn();
      const mockWhere = jest.fn();
      const mockLimit = jest.fn();
      const mockExecute = jest.fn().mockResolvedValue([mockPublicLeague]);

      mockLimit.mockReturnValue({ execute: mockExecute });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const res = mockResponse();
      const req = {
        params: { id: 'league_456' },
        query: { join_code: 'SOME_CODE' },
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(res.locals.is_private_league).toBe(false);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('skips middleware when no league ID provided', async () => {
      const res = mockResponse();
      const req = {
        params: {},
        query: {},
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(database.select).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    test('continues when league does not exist', async () => {
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

      await JoinCodeMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('works with league_id from body (createTeam)', async () => {
      const mockFrom = jest.fn();
      const mockWhere = jest.fn();
      const mockLimit = jest.fn();
      const mockExecute = jest.fn().mockResolvedValue([mockPrivateLeague]);

      mockLimit.mockReturnValue({ execute: mockExecute });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const res = mockResponse();
      const req = {
        params: {},
        body: { league_id: 'league_123' },
        query: { join_code: 'GOLF2025' },
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(res.locals.is_private_league).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    test('returns 500 on database error', async () => {
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
        query: { join_code: 'GOLF2025' },
      } as unknown as Request;

      await JoinCodeMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]: JOIN CODE MIDDLEWARE ERROR:'),
      );

      consoleLogSpy.mockRestore();
    });
  });
});
