jest.mock('../../integrations/GBG/GBG', () => ({
  getAuthToken: jest.fn(),
  fetchState: jest.fn(),
}));

import { NextFunction, Request, Response } from 'express';
import { fetchState, getAuthToken } from '../../integrations/GBG/GBG';
import { fetchGBGStateHandler } from './fetchGBGState';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => {
  jest.resetAllMocks();
});

const mockAuthToken = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  expires_in: 14400,
};

const mockGBGResponse = (status: string, outcome: string) => {
  return {
    status,
    data: {
      context: {
        process: {
          flow: {
            step1: {
              _ggo: true,
              result: {
                outcome,
              },
            },
          },
        },
      },
    },
  };
};

describe('fetchGBGStateHandler', () => {
  beforeEach(() => {
    (getAuthToken as jest.Mock).mockResolvedValue(mockAuthToken);
  });

  describe('Completed verifications', () => {
    test('returns PASS when verification completed with "Decision: Pass"', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Completed', 'Decision: Pass'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(getAuthToken).toHaveBeenCalled();
      expect(fetchState).toHaveBeenCalledWith('test-instance-123', mockAuthToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'PASS' });
    });

    test('returns PASS when verification completed with "Decision: Pass 1+1"', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Completed', 'Decision: Pass 1+1'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'PASS' });
    });

    test('returns PASS when verification completed with "Decision: Pass 2+2"', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Completed', 'Decision: Pass 2+2'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'PASS' });
    });

    test('returns FAIL when verification completed with "Decision: Reject"', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Completed', 'Decision: Reject'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'FAIL' });
    });

    test('returns FAIL when verification completed with "Decision: Alert"', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Completed', 'Decision: Alert'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'FAIL' });
    });

    test('returns MANUAL when verification completed with "Decision: Manual review"', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Completed', 'Decision: Manual review'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'MANUAL' });
    });
  });

  describe('In-progress verifications', () => {
    test('returns MANUAL when verification in progress with "Decision: Manual review"', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('inProgress', 'Decision: Manual review'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'MANUAL' });
    });

    test('returns IN_PROGRESS when verification still in progress (not manual review)', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('inProgress', 'Decision: Pending'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'IN_PROGRESS' });
    });

    test('returns IN_PROGRESS when verification status is neither Completed nor inProgress with manual review', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Processing', 'Decision: Pass'),
      );

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ status: 'IN_PROGRESS' });
    });
  });

  describe('Error handling', () => {
    test('returns 500 when getAuthToken throws an error', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      (getAuthToken as jest.Mock).mockRejectedValue(new Error('Auth token error'));

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]: UPDATE CURRENT USER ERROR: Auth token error'),
      );

      consoleLogSpy.mockRestore();
    });

    test('returns 500 when fetchState throws an error', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      (fetchState as jest.Mock).mockRejectedValue(new Error('GBG API error'));

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]: UPDATE CURRENT USER ERROR: GBG API error'),
      );

      consoleLogSpy.mockRestore();
    });

    test('returns 500 when response data structure is invalid', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      (fetchState as jest.Mock).mockResolvedValue({
        status: 'Completed',
        data: {
          context: {
            process: {
              flow: {},
            },
          },
        },
      });

      const req = {
        query: { instance_id: 'test-instance-123' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('Query parameter handling', () => {
    test('uses instance_id from query parameters', async () => {
      (fetchState as jest.Mock).mockResolvedValue(
        mockGBGResponse('Completed', 'Decision: Pass'),
      );

      const req = {
        query: { instance_id: 'custom-instance-id-456' },
      } as unknown as Request;
      const res = mockResponse();

      await fetchGBGStateHandler(req, res, mockNext);

      expect(fetchState).toHaveBeenCalledWith('custom-instance-id-456', mockAuthToken);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
