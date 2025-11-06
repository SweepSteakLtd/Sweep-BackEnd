jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { getAllUsersHandler } from './getAllUsers';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any, shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          execute: async () => {
            throw new Error('select failed');
          },
        }),
      }),
    }));
  } else {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          execute: async () => result,
        }),
      }),
    }));
  }
};

test('getAllUsersHandler - returns all users when no email filter', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  const users = [
    { id: 'u1', email: 'user1@example.com', first_name: 'User', last_name: 'One' },
    { id: 'u2', email: 'user2@example.com', first_name: 'User', last_name: 'Two' },
  ];
  mockSelectExecute(users);

  await getAllUsersHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: users });
});

test('getAllUsersHandler - filters by email when provided', async () => {
  const res = mockResponse();
  const req = { query: { email: 'user1@example.com' } } as unknown as Request;

  const users = [{ id: 'u1', email: 'user1@example.com', first_name: 'User', last_name: 'One' }];
  mockSelectExecute(users);

  await getAllUsersHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: users });
});

test('getAllUsersHandler - returns 422 when email is invalid', async () => {
  const res = mockResponse();
  const req = { query: { email: 'not-an-email' } } as unknown as Request;

  await getAllUsersHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid query parameter',
      message: 'email must be a valid email address',
    }),
  );
});

test('getAllUsersHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, true);

  await getAllUsersHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
