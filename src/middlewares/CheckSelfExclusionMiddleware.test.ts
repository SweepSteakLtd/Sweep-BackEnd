import { NextFunction, Request, Response } from 'express';
import { User } from '../models';
import { CheckSelfExclusionMiddleware } from './CheckSelfExclusionMiddleware';

describe('CheckSelfExclusionMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    statusMock = jest.fn().mockReturnThis();
    sendMock = jest.fn();
    mockResponse = {
      status: statusMock,
      send: sendMock,
      locals: {},
    };
    mockNext = jest.fn();
  });

  it('should allow request if user is not self-excluded', async () => {
    const mockUser: User = {
      id: 'user123',
      email: 'test@example.com',
      is_self_excluded: false,
      first_name: 'Test',
      last_name: 'User',
      date_of_birth: '1991-06-18',
      nickname: '',
      bio: '',
      profile_picture: '',
      phone_number: '',
      game_stop_id: '',
      is_auth_verified: false,
      is_identity_verified: false,
      deposit_limit: { daily: null, weekly: null, monthly: null },
      betting_limit: 0,
      payment_id: '',
      current_balance: 0,
      is_admin: false,
      kyc_completed: false,
      kyc_instance_id: '',
      exclusion_ending: null,
      address: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockResponse.locals = { user: mockUser };

    await CheckSelfExclusionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should block request if user is self-excluded', async () => {
    const mockUser: User = {
      id: 'user123',
      email: 'test@example.com',
      is_self_excluded: true,
      first_name: 'Test',
      last_name: 'User',
      date_of_birth: "1991-06-18",
      nickname: '',
      bio: '',
      profile_picture: '',
      phone_number: '',
      game_stop_id: 'gamstop123',
      is_auth_verified: false,
      is_identity_verified: false,
      deposit_limit: { daily: null, weekly: null, monthly: null },
      betting_limit: 0,
      payment_id: '',
      current_balance: 0,
      is_admin: false,
      kyc_completed: false,
      kyc_instance_id: '',
      exclusion_ending: null,
      address: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockResponse.locals = { user: mockUser };

    await CheckSelfExclusionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(sendMock).toHaveBeenCalledWith({
      error: 'Self-Exclusion Active',
      message:
        'You are currently self-excluded from betting activities through GamStop. This restriction prevents you from placing bets, creating teams, or joining leagues. If you believe this is an error, please contact support.',
      selfExcluded: true,
    });
  });

  it('should return 401 if no user is found', async () => {
    mockResponse.locals = {};

    await CheckSelfExclusionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(sendMock).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'User authentication required',
    });
  });

  it('should handle errors gracefully', async () => {
    // Simulate an error by making res.locals.user throw when accessed
    Object.defineProperty(mockResponse, 'locals', {
      get: () => {
        throw new Error('Simulated error');
      },
    });

    await CheckSelfExclusionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(sendMock).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while checking self-exclusion status',
    });
  });
});
