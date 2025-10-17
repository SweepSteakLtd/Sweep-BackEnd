jest.mock('@paralleldrive/cuid2', () => ({ createId: () => 'test-game-id' }));
jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { createGameHandler } from './createGame';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockInsertExecute = (shouldThrow = false) => {
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
      values: () => ({ execute: async () => ({}) }),
    }));
  }
};

test('createGameHandler - returns 201 and created game when required fields present', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  mockInsertExecute(false);

  await createGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent).toHaveProperty('data');
  expect(sent.data).toMatchObject({ id: 'test-game-id', name: 'Game A', entry_fee: 100 });
});

test('createGameHandler - returns 422 when missing required fields', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = { body: { name: 'Nope' } } as unknown as Request;

  await createGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({ error: 'Invalid request body', message: 'required properties missing' });
});

test('createGameHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  mockInsertExecute(true);

  await createGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal Server Error' }));
});
