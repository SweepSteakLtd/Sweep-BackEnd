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

function mockSelectChain(results: any[][]) {
  // Mock chained select calls - shifts results array on each execute
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({ execute: async () => results.shift() || [] }),
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
    jest
      .spyOn(database as any, 'insert')
      .mockImplementation(() => ({ values: () => ({ execute: async () => ({}) }) }));
  }
}

// Authentication validation
test('createBetHandler - returns 403 if user is not authenticated', async () => {
  const res = mockResponse();
  // res.locals.user not set
  const req = { body: { league_id: 'g1', player_ids: ['p1'], amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'User authentication is required',
    }),
  );
});

// Required field validation
test('createBetHandler - returns 422 when league_id is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { body: { player_ids: ['p1'], amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: league_id',
    }),
  );
});

test('createBetHandler - returns 422 when player_ids is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { body: { league_id: 'g1', amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: player_ids',
    }),
  );
});

test('createBetHandler - returns 422 when amount is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { body: { league_id: 'g1', player_ids: ['p1'] } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: amount',
    }),
  );
});

// league_id validation
test('createBetHandler - returns 422 when league_id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { body: { league_id: '   ', player_ids: ['p1'], amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'league_id must be a non-empty string',
    }),
  );
});

// player_ids validation
test('createBetHandler - returns 422 when player_ids is not an array', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    body: { league_id: 'g1', player_ids: 'not-an-array', amount: 100 },
  } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must be an array',
    }),
  );
});

test('createBetHandler - returns 422 when player_ids is empty array', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { body: { league_id: 'g1', player_ids: [], amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must contain at least one item',
    }),
  );
});

test('createBetHandler - returns 422 when player_ids exceeds 10 players', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    body: {
      league_id: 'g1',
      player_ids: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'],
      amount: 100,
    },
  } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must not exceed 10 items',
    }),
  );
});

test('createBetHandler - returns 422 when player_id is not a string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    body: { league_id: 'g1', player_ids: ['p1', 123], amount: 100 },
  } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'All player_ids must be non-empty strings',
    }),
  );
});

test('createBetHandler - returns 422 when player_id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    body: { league_id: 'g1', player_ids: ['p1', '   '], amount: 100 },
  } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'All player_ids must be non-empty strings',
    }),
  );
});

test('createBetHandler - returns 422 when player_ids contains duplicates', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    body: { league_id: 'g1', player_ids: ['p1', 'p2', 'p1'], amount: 100 },
  } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must contain unique values (no duplicates)',
    }),
  );
});

// amount validation
test('createBetHandler - returns 422 when amount is not a number', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    body: { league_id: 'g1', player_ids: ['p1'], amount: 'not-a-number' },
  } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'amount must be a number',
    }),
  );
});

test('createBetHandler - returns 422 when amount is zero', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { body: { league_id: 'g1', player_ids: ['p1'], amount: 0 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'amount must be at least 0.01',
    }),
  );
});

test('createBetHandler - returns 422 when amount is negative', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { body: { league_id: 'g1', player_ids: ['p1'], amount: -50 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'amount must be at least 0.01',
    }),
  );
});

// Business logic validation
test('createBetHandler - returns 422 when amount exceeds current balance', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 5000, current_balance: 100 };
  const req = { body: { league_id: 'g1', player_ids: ['p1'], amount: 200 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Insufficient balance',
      message: 'User current balance is not enough to place this bet',
    }),
  );
});

test('createBetHandler - returns 422 when betting limit exceeded', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 100, current_balance: 1000 };

  const req = { body: { league_id: 'g2', player_ids: ['p1'], amount: 200 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Betting limit exceeded' }),
  );
});

test('createBetHandler - creates team and bet and returns 201', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };

  // Mock select for league and players
  const existingLeague = [
    {
      id: 'g2',
      entry_fee: 50,
      start_time: new Date(Date.now() + 10000),
      end_time: new Date(Date.now() + 100000),
    },
  ];
  const existingPlayers = [{ id: 'p1' }, { id: 'p2' }];
  mockSelectChain([existingLeague, existingPlayers]);

  mockInsertExecute(false);

  const req = {
    body: { league_id: 'g2', player_ids: ['p1', 'p2'], amount: 100 },
  } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent).toHaveProperty('data');
  expect(sent.data).toMatchObject({ owner_id: 'u1', league_id: 'g2', amount: 100 });
});

test('createBetHandler - returns 500 on DB insert error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };

  const existingLeague = [
    {
      id: 'g2',
      entry_fee: 50,
      start_time: new Date(Date.now() + 10000),
      end_time: new Date(Date.now() + 100000),
    },
  ];
  const existingPlayers = [{ id: 'p1' }];
  mockSelectChain([existingLeague, existingPlayers]);
  mockInsertExecute(true);

  const req = { body: { league_id: 'g2', player_ids: ['p1'], amount: 100 } } as unknown as Request;

  await createBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
