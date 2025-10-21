jest.mock('@paralleldrive/cuid2', () => ({ createId: () => 'test-id' }));
jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { createBetHandler } from './createBet';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

function mockSelectAllBets(result: any[]) {
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({ where: () => ({ execute: async () => result }) }),
  }));
}

function mockSelectGames(result: any[]) {
  // for the second select call which includes andWhere
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        andWhere: () => ({ execute: async () => result }),
      }),
    }),
  }));
}

function mockInsertExecute(shouldThrow = false) {
  if (shouldThrow) {
    jest.spyOn(database as any, 'insert').mockImplementation(() => ({
      values: () => ({
        execute: async () => {
          throw new Error('insert failed');
        },
      }),
    }));
  } else {
    jest.spyOn(database as any, 'insert').mockImplementation(() => ({ values: () => ({ execute: async () => ({}) }) }));
  }
}

test('createBetHandler - returns 422 when missing required fields', async () => {
  const res = mockResponse();
  const req = { body: { game_id: null } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({ error: 'Invalid request body', message: 'required properties missing' });
});

test('createBetHandler - returns 422 when betting limit exceeded', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 100 };

  // existing bets total 50, future games include that bet
  const allBets = [{ id: 'b1', game_id: 'g1', amount: 50 }];
  mockSelectAllBets(allBets);
  mockSelectGames([{ id: 'g1', end_time: new Date(Date.now() + 100000) }]);

  const req = { body: { game_id: 'g2', player_ids: ['p1'], amount: 60 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Betting limit exceeded' }));
});

test('createBetHandler - creates team and bet and returns 201', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000 };

  // no existing bets
  mockSelectAllBets([]);
  // selecting games returns empty array (no future games)
  mockSelectGames([]);

  mockInsertExecute(false);

  const req = { body: { game_id: 'g2', player_ids: ['p1', 'p2'], amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent).toHaveProperty('data');
  expect(sent.data).toMatchObject({ owner_id: 'u1', game_id: 'g2', amount: 100 });
});

test('createBetHandler - returns 500 on DB insert error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000 };

  mockSelectAllBets([]);
  mockSelectGames([]);
  mockInsertExecute(true);

  const req = { body: { game_id: 'g2', player_ids: ['p1'], amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal Server Error' }));
});
