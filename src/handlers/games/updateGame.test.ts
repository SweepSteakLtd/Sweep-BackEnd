jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { updateGameHandler } from './updateGame';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

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
    jest.spyOn(database as any, 'update').mockImplementation(() => ({ set: () => ({ where: () => ({ execute: async () => result }) }) }));
  }
};

test('updateGameHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: {} } as unknown as Request;

  await updateGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({ error: 'Invalid request body', message: 'required properties missing' });
});

test('updateGameHandler - returns 422 when no updatable properties provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { id: 'g1' } } as unknown as Request;

  await updateGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({ error: 'Invalid request body', message: 'required properties missing' });
});

test('updateGameHandler - updates game and returns 200', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };
  const req = { body: { id: 'g1', name: 'New Name' } } as unknown as Request;

  const finished = { id: 'g1', name: 'New Name' };
  mockUpdateExecute(finished);

  await updateGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: finished });
});

test('updateGameHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };
  const req = { body: { id: 'g1', name: 'New Name' } } as unknown as Request;

  mockUpdateExecute(null, true);

  await updateGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal Server Error' }));
});
