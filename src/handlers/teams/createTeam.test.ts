jest.mock('@paralleldrive/cuid2', () => ({ createId: () => 'test-id' }));
jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { createTeamHandler } from './createTeam';

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
      where: () => ({
        limit: () => ({ execute: async () => results.shift() || [] }),
        execute: async () => results.shift() || [],
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
    jest
      .spyOn(database as any, 'insert')
      .mockImplementation(() => ({ values: () => ({ execute: async () => ({}) }) }));
  }
}

// Authentication validation
test('createTeamHandler - returns 403 if user is not authenticated', async () => {
  const res = mockResponse();
  // res.locals.user not set
  const req = { body: { name: 'Team 1', players: ['p1'] } } as unknown as Request;

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'User authentication is required',
    }),
  );
});

// Validation tests
test('createTeamHandler - returns 422 when name is not a string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { name: 123 } } as unknown as Request;

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must be a non-empty string',
    }),
  );
});

test('createTeamHandler - returns 422 when name exceeds max length', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const longName = 'a'.repeat(201);
  const req = { body: { name: longName } } as unknown as Request;

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must not exceed 200 characters',
    }),
  );
});

test('createTeamHandler - returns 422 when league_id is not a string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { league_id: 123 } } as unknown as Request;

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'league_id must be a non-empty string',
    }),
  );
});

test('createTeamHandler - returns 404 when league does not exist', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { league_id: 'nonexistent' } } as unknown as Request;

  // Mock league not found
  mockSelectChain([[]]);

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Not found',
      message: 'League not found',
    }),
  );
});

test('createTeamHandler - returns 403 when user has reached max teams limit', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { league_id: 'league1' } } as unknown as Request;

  // Mock league with max_participants = 2
  // Mock user already has 2 teams in the league
  mockSelectChain([
    [{ id: 'league1', max_participants: 2 }], // league query
    [{ id: 'team1' }, { id: 'team2' }], // user teams query (2 teams)
  ]);

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'You have reached the maximum number of teams (2) allowed in this league',
    }),
  );
});

test('createTeamHandler - creates team when max_participants is null (no limit)', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {
    body: { name: 'Unlimited Team', league_id: 'league1' },
  } as unknown as Request;

  // Mock league with max_participants = null (no limit)
  mockSelectChain([[{ id: 'league1', max_participants: null }]]);
  mockInsertExecute();

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalledWith({
    data: expect.objectContaining({
      id: 'test-id',
      owner_id: 'u1',
      name: 'Unlimited Team',
    }),
  });
});

test('createTeamHandler - returns 422 when players is not an array', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { league_id: 'league1', players: 'not-an-array' } } as unknown as Request;

  // Mock league exists
  mockSelectChain([
    [{ id: 'league1', max_participants: 5 }], // league query
  ]);

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'players must be an array',
    }),
  );
});

test('createTeamHandler - returns 422 when players contains invalid player_id', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { league_id: 'league1', players: ['p1', 123, 'p3'] } } as unknown as Request;

  // Mock league exists
  mockSelectChain([
    [{ id: 'league1', max_participants: 5 }], // league query
  ]);

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Each player_id must be a non-empty string',
    }),
  );
});

// Success cases
test('createTeamHandler - creates team with all fields', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {
    body: { name: 'Dream Team', league_id: 'league1', players: ['p1', 'p2'] },
  } as unknown as Request;

  // Mock league exists with max_participants = 5
  // Mock user has 1 team in the league (can create more)
  mockSelectChain([
    [{ id: 'league1', max_participants: 5 }], // league query
    [{ id: 'existing_team' }], // user teams query (1 team)
  ]);
  mockInsertExecute();

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalledWith({
    data: expect.objectContaining({
      id: 'test-id',
      owner_id: 'u1',
      name: 'Dream Team',
      player_ids: ['p1', 'p2'],
      position: null,
    }),
  });
});

test('createTeamHandler - returns 422 when creating team without league_id (minimal fields)', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: {} } as unknown as Request;

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'league_id must be a non-empty string',
    }),
  );
});

test('createTeamHandler - returns 422 when creating team without league_id', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {
    body: { name: 'Team Without League', players: ['p1'] },
  } as unknown as Request;

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'league_id must be a non-empty string',
    }),
  );
});

// Error handling
test('createTeamHandler - returns 500 on database error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { body: { name: 'Team 1', league_id: 'league1' } } as unknown as Request;

  // Mock league exists, user teams check, then database error on insert
  mockSelectChain([
    [{ id: 'league1', max_participants: 5 }], // league query
    [], // user teams query (0 teams)
  ]);
  mockInsertExecute(true);

  await createTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
    }),
  );
});
