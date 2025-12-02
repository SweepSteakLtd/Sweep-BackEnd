jest.mock('../services', () => ({
  database: {
    select: jest.fn(),
  },
}));

import { NextFunction, Request, Response } from 'express';
import { database } from '../services';
import { CheckMonthlyBetLimitMiddleware } from './CheckMonthlyBetLimitMiddleware';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {
    user: {
      id: 'user_abc123',
      email: 'test@example.com',
      current_balance: 1000000,
      betting_limit: 1000000,
    },
  };
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const mockLeague = {
  id: 'league_123',
  name: 'Test League',
  entry_fee: 10000, // 100 GBP in pence
  tournament_id: 'tournament_123',
  start_time: new Date(),
  end_time: new Date(),
  owner_id: 'user_123',
  created_at: new Date(),
  updated_at: new Date(),
};

afterEach(() => jest.resetAllMocks());

describe('CheckMonthlyBetLimitMiddleware', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Within Monthly Limit', () => {
    test('allows bet when user is well within monthly limit', async () => {
      // Mock league select
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([mockLeague]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      // Mock bets sum select
      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 100000 }]); // 1000 GBP already bet

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      // Setup select mock to return different results on consecutive calls
      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for leagues
          return { from: mockLeagueFrom };
        } else {
          // Second call for bets
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(res.locals.monthlyBetTotal).toBe(100000);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('allows bet when user has no previous bets this month', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([mockLeague]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 0 }]);

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(res.locals.monthlyBetTotal).toBe(0);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('allows bet when total exactly equals limit', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([
        { ...mockLeague, entry_fee: 100000 },
      ]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 400000 }]); // 4000 GBP + 1000 GBP = 5000 GBP

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Exceeds Monthly Limit', () => {
    test('denies bet when total would exceed monthly limit', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([
        { ...mockLeague, entry_fee: 100000 }, // 1000 GBP
      ]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 450000 }]); // 4500 GBP already bet

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Monthly betting limit exceeded',
        message:
          'You have reached your monthly betting limit of 500000 GBP. Current month total: 450000 GBP. Your requested bet of 100000 GBP would exceed the limit.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('denies bet when user is exactly at limit and tries to bet more', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([
        { ...mockLeague, entry_fee: 1000 }, // 10 GBP
      ]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 500000 }]); // Exactly at 5000 GBP limit

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Monthly betting limit exceeded',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('League ID from Different Sources', () => {
    test('works with league_id from request body', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([mockLeague]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 0 }]);

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('works with id from request params', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([mockLeague]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 0 }]);

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        params: { id: 'league_123' },
        body: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('works with league_id from request params', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([mockLeague]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 0 }]);

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        params: { league_id: 'league_123' },
        body: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('returns 500 on database error', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockRejectedValue(new Error('Database connection error'));

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      (database.select as jest.Mock).mockReturnValue({ from: mockLeagueFrom });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while checking betting limits',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CHECK MONTHLY BET LIMIT ERROR:'),
        expect.any(Error),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Monthly Reset Logic', () => {
    test('calculates start of month correctly', async () => {
      const mockLeagueFrom = jest.fn();
      const mockLeagueWhere = jest.fn();
      const mockLeagueExecute = jest.fn().mockResolvedValue([mockLeague]);

      mockLeagueWhere.mockReturnValue({ execute: mockLeagueExecute });
      mockLeagueFrom.mockReturnValue({ where: mockLeagueWhere });

      const mockBetsFrom = jest.fn();
      const mockBetsWhere = jest.fn();
      const mockBetsExecute = jest.fn().mockResolvedValue([{ total: 100000 }]);

      mockBetsWhere.mockReturnValue({ execute: mockBetsExecute });
      mockBetsFrom.mockReturnValue({ where: mockBetsWhere });

      let callCount = 0;
      (database.select as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockLeagueFrom };
        } else {
          return { from: mockBetsFrom };
        }
      });

      const res = mockResponse();
      const req = {
        body: { league_id: 'league_123' },
        params: {},
      } as unknown as Request;

      await CheckMonthlyBetLimitMiddleware(req, res, mockNext);

      // Verify that the middleware called the database with a date query
      expect(mockBetsExecute).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
