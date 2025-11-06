jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { updateBetHandler } from './updateBet';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectChain = (results: any[][]) => {
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({ execute: async () => results.shift() || [] }),
    }),
  }));
};

const mockUpdateExecute = (shouldThrow = false) => {
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
          execute: async () => ({}),
        }),
      }),
    }));
  }
};

// Authentication validation
test('updateBetHandler - returns 403 if user is not authenticated', async () => {
  const res = mockResponse();
  // res.locals.user not set
  const req = { params: { id: 'b1' }, body: { amount: 100 } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'User authentication is required',
    }),
  );
});

// ID validation
test('updateBetHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: {}, body: { amount: 100 } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required parameter: id',
    }),
  );
});

test('updateBetHandler - returns 422 when id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: '   ' }, body: { amount: 100 } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'id must be a non-empty string',
    }),
  );
});

// amount validation
test('updateBetHandler - returns 422 when amount is not a number', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { params: { id: 'b1' }, body: { amount: 'not-a-number' } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'amount must be a number',
    }),
  );
});

test('updateBetHandler - returns 422 when amount is zero', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { params: { id: 'b1' }, body: { amount: 0 } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'amount must be at least 0.01',
    }),
  );
});

test('updateBetHandler - returns 422 when amount is negative', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { params: { id: 'b1' }, body: { amount: -50 } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'amount must be at least 0.01',
    }),
  );
});

// player_ids validation
test('updateBetHandler - returns 422 when player_ids is not an array', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: { player_ids: 'not-an-array', team_id: 't1' },
  } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must be an array',
    }),
  );
});

test('updateBetHandler - returns 422 when player_ids is empty array', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: { player_ids: [], team_id: 't1' },
  } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must contain at least one item',
    }),
  );
});

test('updateBetHandler - returns 422 when player_ids exceeds 10 players', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: {
      player_ids: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'],
      team_id: 't1',
    },
  } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must not exceed 10 items',
    }),
  );
});

test('updateBetHandler - returns 422 when player_id is not a string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: { player_ids: ['p1', 123], team_id: 't1' },
  } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'All player_ids must be non-empty strings',
    }),
  );
});

test('updateBetHandler - returns 422 when player_id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: { player_ids: ['p1', '   '], team_id: 't1' },
  } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'All player_ids must be non-empty strings',
    }),
  );
});

test('updateBetHandler - returns 422 when player_ids contains duplicates', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: { player_ids: ['p1', 'p2', 'p1'], team_id: 't1' },
  } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'player_ids must contain unique values (no duplicates)',
    }),
  );
});

// team_id validation
test('updateBetHandler - returns 422 when team_id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: { team_id: '   ', player_ids: ['p1'] },
  } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'team_id must be a non-empty string',
    }),
  );
});

// Business logic validation
test('updateBetHandler - returns 422 when team_id missing but player_ids provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'b1' }, body: { player_ids: ['p1'] } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'team_id must be provided when updating player_ids',
    }),
  );
});

test('updateBetHandler - returns 422 when no properties to update', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'b1' }, body: {} } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'At least one property (amount or player_ids) must be provided for update',
    }),
  );
});

test('updateBetHandler - returns 422 when amount exceeds current balance', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 5000, current_balance: 100 };
  const req = { params: { id: 'b1' }, body: { amount: 200 } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'User current balance is not enough to place this bet',
    }),
  );
});

test('updateBetHandler - returns 422 when amount exceeds betting limit', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 100, current_balance: 1000 };
  const req = { params: { id: 'b1' }, body: { amount: 200 } } as unknown as Request;

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: expect.stringContaining('User betting limit is'),
    }),
  );
});

test('updateBetHandler - updates bet amount successfully and returns 200', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { params: { id: 'b1' }, body: { amount: 150 } } as unknown as Request;

  const updatedBet = { id: 'b1', owner_id: 'u1', league_id: 'l1', amount: 150 };
  mockUpdateExecute(false);
  mockSelectChain([[updatedBet]]);

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: updatedBet });
});

test('updateBetHandler - updates bet players successfully and returns 200', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = {
    params: { id: 'b1' },
    body: { player_ids: ['p1', 'p2'], team_id: 't1' },
  } as unknown as Request;

  const existingTeam = [{ id: 't1', owner_id: 'u1' }];
  const existingPlayers = [{ id: 'p1' }, { id: 'p2' }];
  const updatedBet = { id: 'b1', owner_id: 'u1', league_id: 'l1', team_id: 't1' };
  mockSelectChain([existingTeam, existingPlayers, [updatedBet]]);
  mockUpdateExecute(false);

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: updatedBet });
});

test('updateBetHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', betting_limit: 1000, current_balance: 2000 };
  const req = { params: { id: 'b1' }, body: { amount: 150 } } as unknown as Request;

  mockUpdateExecute(true);

  await updateBetHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
