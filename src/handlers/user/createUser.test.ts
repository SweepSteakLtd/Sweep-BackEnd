jest.mock('@paralleldrive/cuid2', () => ({ createId: () => 'test-id' }));
jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { createUserHandler } from './createUser';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => {
  jest.resetAllMocks();
});

const mockSelectExecute = (result: any) => {
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => ({
          execute: async () => result,
        }),
      }),
    }),
  }));
};

const mockInsertExecute = (result: any, shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'insert').mockImplementation(() => ({
      values: () => ({
        execute: async () => {
          throw new Error('insert failed');
        },
      }),
    }));
  } else {
    jest.spyOn(database as any, 'insert').mockImplementation(() => ({
      values: () => ({
        execute: async () => result,
      }),
    }));
  }
};

test('createUserHandler - creates a new user and returns 201', async () => {
  mockSelectExecute([]); // no existing users
  mockInsertExecute({ affectedRows: 1 });

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      bio: 'Golf enthusiast',
      profile_picture: 'https://example.com/avatar.jpg',
      phone_number: '+1234567890',
      deposit_limit: 1200,
      betting_limit: 2400,
    },
  } as unknown as Request;

  const res = mockResponse();

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent).toHaveProperty('data');
  expect(sent.data).toMatchObject({
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
  });
  expect(sent.data.id).toBe('test-id');
});

test('createUserHandler - returns 400 if user with email exists', async () => {
  mockSelectExecute([{ id: 'existing-id', email: 'john.doe@example.com' }]);

  const req = {
    body: { email: 'john.doe@example.com' },
  } as unknown as Request;

  const res = mockResponse();

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Bad Request',
      message: 'User with this email already exists',
    }),
  );
});

test('createUserHandler - returns 500 on DB insert error', async () => {
  mockSelectExecute([]); // no existing users
  mockInsertExecute(null, true); // make insert throw

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.error@example.com',
    },
  } as unknown as Request;

  const res = mockResponse();

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }),
  );
});
