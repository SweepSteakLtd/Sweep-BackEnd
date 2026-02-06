jest.mock('../../services', () => ({
  database: {
    delete: jest.fn(),
    select: jest.fn(),
  },
  firebaseAuth: {
    getUserByEmail: jest.fn(),
    deleteUser: jest.fn(),
  },
  createAuditLog: jest.fn(),
}));

import { Request, Response } from 'express';
import { database, firebaseAuth, createAuditLog } from '../../services';
import { deleteCurrentUserHandler } from './deleteCurrentUser';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

afterEach(() => jest.resetAllMocks());

describe('deleteCurrentUserHandler', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    nickname: 'testuser',
    date_of_birth: '1990-01-01',
    bio: 'Test bio',
    profile_picture: '',
    phone_number: '',
    game_stop_id: '',
    is_auth_verified: true,
    is_identity_verified: true,
    deposit_limit: { daily: null, weekly: null, monthly: null },
  };

  beforeEach(() => {
    // Mock database delete chain
    const mockDeleteExecute = jest.fn().mockResolvedValue(undefined);
    const mockDeleteWhere = jest.fn().mockReturnValue({ execute: mockDeleteExecute });
    (database.delete as jest.Mock).mockReturnValue({ where: mockDeleteWhere });

    // Mock database select chain for fetching user
    const mockSelectExecute = jest.fn().mockResolvedValue([mockUser]);
    const mockLimit = jest.fn().mockReturnValue({ execute: mockSelectExecute });
    const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

    // Mock createAuditLog
    (createAuditLog as jest.Mock).mockResolvedValue(undefined);
  });

  test('successfully deletes user from Firebase and database', async () => {
    const mockFirebaseUser = { uid: 'firebase-uid-123' };
    (firebaseAuth.getUserByEmail as jest.Mock).mockResolvedValue(mockFirebaseUser);
    (firebaseAuth.deleteUser as jest.Mock).mockResolvedValue(undefined);

    const res = mockResponse();
    res.locals.user = mockUser;
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(firebaseAuth.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(firebaseAuth.deleteUser).toHaveBeenCalledWith('firebase-uid-123');
    expect(database.delete).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: 'DELETE_USER',
        entityType: 'user',
        entityId: mockUser.id,
        oldValues: mockUser,
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ data: { deleted: true } });
  });

  test('returns 400 when email is missing', async () => {
    const res = mockResponse();
    res.locals.user = mockUser;
    const req = {
      query: {},
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Email is required',
    });
    expect(firebaseAuth.getUserByEmail).not.toHaveBeenCalled();
    expect(database.delete).not.toHaveBeenCalled();
  });

  test('returns 403 when authenticated user tries to delete different user', async () => {
    const res = mockResponse();
    res.locals.user = mockUser; // Authenticated as test@example.com
    const req = {
      query: { email: 'other@example.com' }, // Trying to delete different user
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'You can only delete your own account',
    });
    expect(database.select).not.toHaveBeenCalled();
    expect(firebaseAuth.getUserByEmail).not.toHaveBeenCalled();
    expect(database.delete).not.toHaveBeenCalled();
  });

  test('returns 403 when no authenticated user in res.locals', async () => {
    const res = mockResponse();
    // res.locals.user is undefined
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'You can only delete your own account',
    });
    expect(database.select).not.toHaveBeenCalled();
    expect(firebaseAuth.getUserByEmail).not.toHaveBeenCalled();
    expect(database.delete).not.toHaveBeenCalled();
  });

  test('returns 404 when user not found in database', async () => {
    // Mock empty result from database
    const mockSelectExecute = jest.fn().mockResolvedValue([]);
    const mockLimit = jest.fn().mockReturnValue({ execute: mockSelectExecute });
    const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    (database.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const res = mockResponse();
    res.locals.user = mockUser;
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Not Found',
      message: 'User not found',
    });
    expect(firebaseAuth.getUserByEmail).not.toHaveBeenCalled();
    expect(database.delete).not.toHaveBeenCalled();
  });

  test('continues deletion if user not found in Firebase', async () => {
    const firebaseError = new Error('User not found');
    (firebaseError as any).code = 'auth/user-not-found';
    (firebaseAuth.getUserByEmail as jest.Mock).mockRejectedValue(firebaseError);

    const res = mockResponse();
    res.locals.user = mockUser;
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(firebaseAuth.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(database.delete).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ data: { deleted: true } });
  });

  test('returns 500 when Firebase throws non-user-not-found error', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const firebaseError = new Error('Firebase service error');
    (firebaseError as any).code = 'auth/internal-error';
    (firebaseAuth.getUserByEmail as jest.Mock).mockRejectedValue(firebaseError);

    const res = mockResponse();
    res.locals.user = mockUser;
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(database.delete).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  test('returns 500 when database deletion fails', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockFirebaseUser = { uid: 'firebase-uid-123' };
    (firebaseAuth.getUserByEmail as jest.Mock).mockResolvedValue(mockFirebaseUser);
    (firebaseAuth.deleteUser as jest.Mock).mockResolvedValue(undefined);

    const mockDeleteExecute = jest.fn().mockRejectedValue(new Error('Database error'));
    const mockDeleteWhere = jest.fn().mockReturnValue({ execute: mockDeleteExecute });
    (database.delete as jest.Mock).mockReturnValue({ where: mockDeleteWhere });

    const res = mockResponse();
    res.locals.user = mockUser;
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });

    consoleLogSpy.mockRestore();
  });
});
