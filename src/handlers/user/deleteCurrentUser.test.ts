jest.mock('../../services', () => ({
  database: {
    delete: jest.fn(),
  },
  firebaseAuth: {
    getUserByEmail: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

import { NextFunction, Request, Response } from 'express';
import { database, firebaseAuth } from '../../services';
import { deleteCurrentUserHandler } from './deleteCurrentUser';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

describe('deleteCurrentUserHandler', () => {
  beforeEach(() => {
    // Mock database delete chain
    const mockExecute = jest.fn().mockResolvedValue(undefined);
    const mockWhere = jest.fn().mockReturnValue({ execute: mockExecute });
    (database.delete as jest.Mock).mockReturnValue({ where: mockWhere });
  });

  test('successfully deletes user from Firebase and database', async () => {
    const mockFirebaseUser = { uid: 'firebase-uid-123' };
    (firebaseAuth.getUserByEmail as jest.Mock).mockResolvedValue(mockFirebaseUser);
    (firebaseAuth.deleteUser as jest.Mock).mockResolvedValue(undefined);

    const res = mockResponse();
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res, mockNext);

    expect(firebaseAuth.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(firebaseAuth.deleteUser).toHaveBeenCalledWith('firebase-uid-123');
    expect(database.delete).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ data: { deleted: true } });
  });

  test('returns 400 when email is missing', async () => {
    const res = mockResponse();
    const req = {
      query: {},
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Email is required',
    });
    expect(firebaseAuth.getUserByEmail).not.toHaveBeenCalled();
    expect(database.delete).not.toHaveBeenCalled();
  });

  test('continues deletion if user not found in Firebase', async () => {
    const firebaseError = new Error('User not found');
    (firebaseError as any).code = 'auth/user-not-found';
    (firebaseAuth.getUserByEmail as jest.Mock).mockRejectedValue(firebaseError);

    const res = mockResponse();
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res, mockNext);

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
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res, mockNext);

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

    const mockExecute = jest.fn().mockRejectedValue(new Error('Database error'));
    const mockWhere = jest.fn().mockReturnValue({ execute: mockExecute });
    (database.delete as jest.Mock).mockReturnValue({ where: mockWhere });

    const res = mockResponse();
    const req = {
      query: { email: 'test@example.com' },
    } as unknown as Request;

    await deleteCurrentUserHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });

    consoleLogSpy.mockRestore();
  });
});
