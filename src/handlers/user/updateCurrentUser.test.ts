jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { updateCurrentUserHandler } from './updateCurrentUser';

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

const mockUpdateExecute = (result: any, shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'update').mockImplementation(() => ({
      set: () => ({
        where: () => ({
          execute: async () => {
            throw new Error('update failed');
          },
        }),
      }),
    }));
  } else {
    jest.spyOn(database as any, 'update').mockImplementation(() => ({
      set: () => ({
        where: () => ({
          execute: async () => result,
        }),
      }),
    }));
  }
};

test('updateCurrentUserHandler - updates user and returns 200', async () => {
  const res = mockResponse();
  (res as any).locals.user = { email: 'john.doe@example.com' };

  const req = {
    body: {
      first_name: 'Johnny',
      bio: 'Updated bio',
    },
  } as unknown as Request;

  const finished = { id: 'u1', email: 'john.doe@example.com', first_name: 'Johnny', bio: 'Updated bio' };
  mockUpdateExecute(finished);

  await updateCurrentUserHandler(req, res, mockNext);

  expect(database.update).toBeDefined();
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: finished });
});

test('updateCurrentUserHandler - returns 422 when no allowed properties provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { email: 'john.doe@example.com' };

  const req = {
    body: {
      some_random_field: 'nope',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({ error: 'Invalid request body', message: 'required properties missing' });
});

test('updateCurrentUserHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { email: 'john.error@example.com' };

  const req = {
    body: {
      first_name: 'John',
    },
  } as unknown as Request;

  mockUpdateExecute(null, true);

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }),
  );
});
