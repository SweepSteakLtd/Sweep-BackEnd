jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { updateTeamHandler } from './updateTeam';

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
      where: () => ({
        limit: () => ({ execute: async () => results.shift() || [] }),
        execute: async () => results.shift() || [],
      }),
    }),
  }));
};

const mockUpdateExecute = (returnData: any[] = [], shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'update').mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: () => ({
            execute: async () => {
              throw new Error('update failed');
            },
          }),
        }),
      }),
    }));
  } else {
    jest.spyOn(database as any, 'update').mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: () => ({
            execute: async () => returnData,
          }),
        }),
      }),
    }));
  }
};

// Authentication validation
test('updateTeamHandler - returns 403 if user is not authenticated', async () => {
  const res = mockResponse();
  // res.locals.user not set
  const req = { params: { id: 't1' }, body: { name: 'Updated Team' } } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'User authentication is required',
    }),
  );
});

// ID validation
test('updateTeamHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: {}, body: { name: 'Updated Team' } } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required parameter: id',
    }),
  );
});

test('updateTeamHandler - returns 422 when id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: '   ' }, body: { name: 'Updated Team' } } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'id must be a non-empty string',
    }),
  );
});

// Field validation
test('updateTeamHandler - returns 422 when name is not a string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { name: 123 } } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must be a non-empty string',
    }),
  );
});

test('updateTeamHandler - returns 422 when name exceeds max length', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const longName = 'a'.repeat(201);
  const req = { params: { id: 't1' }, body: { name: longName } } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must not exceed 200 characters',
    }),
  );
});

test('updateTeamHandler - returns 422 when players is not an array', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { players: 'not-an-array' } } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'players must be an array',
    }),
  );
});

test('updateTeamHandler - returns 422 when players contains invalid player_id', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { players: ['p1', 123, 'p3'] } } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Each player_id must be a non-empty string',
    }),
  );
});

test('updateTeamHandler - returns 422 when no updateable properties provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: {} } as unknown as Request;

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'At least one updateable property must be provided (name, players)',
    }),
  );
});

// Not found / unauthorized
test('updateTeamHandler - returns 404 when team not found', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { name: 'Updated Team' } } as unknown as Request;

  // Mock team not found
  mockSelectChain([[]]);

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Not found',
      message: 'Team not found or you do not have permission to update it',
    }),
  );
});

test('updateTeamHandler - returns 404 when team belongs to different user', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { name: 'Updated Team' } } as unknown as Request;

  // Mock team exists but belongs to different user (empty result from auth check)
  mockSelectChain([[]]);

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Not found',
    }),
  );
});

// Success cases
test('updateTeamHandler - updates team name', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { name: 'Updated Team' } } as unknown as Request;

  // Mock team exists
  mockSelectChain([[{ id: 't1', owner_id: 'u1', name: 'Old Team', player_ids: ['p1'] }]]);

  // Mock update returns updated team
  const updatedTeam = {
    id: 't1',
    owner_id: 'u1',
    name: 'Updated Team',
    player_ids: ['p1'],
    position: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date(),
  };
  mockUpdateExecute([updatedTeam]);

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: expect.objectContaining({
      id: 't1',
      name: 'Updated Team',
    }),
  });
});

test('updateTeamHandler - updates team players', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { players: ['p2', 'p3'] } } as unknown as Request;

  // Mock team exists
  mockSelectChain([[{ id: 't1', owner_id: 'u1', name: 'Team', player_ids: ['p1'] }]]);

  // Mock update returns updated team
  const updatedTeam = {
    id: 't1',
    owner_id: 'u1',
    name: 'Team',
    player_ids: ['p2', 'p3'],
    position: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date(),
  };
  mockUpdateExecute([updatedTeam]);

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: expect.objectContaining({
      id: 't1',
      player_ids: ['p2', 'p3'],
    }),
  });
});

test('updateTeamHandler - updates both name and players', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {
    params: { id: 't1' },
    body: { name: 'New Team', players: ['p2', 'p3'] },
  } as unknown as Request;

  // Mock team exists
  mockSelectChain([[{ id: 't1', owner_id: 'u1', name: 'Old Team', player_ids: ['p1'] }]]);

  // Mock update returns updated team
  const updatedTeam = {
    id: 't1',
    owner_id: 'u1',
    name: 'New Team',
    player_ids: ['p2', 'p3'],
    position: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date(),
  };
  mockUpdateExecute([updatedTeam]);

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: expect.objectContaining({
      id: 't1',
      name: 'New Team',
      player_ids: ['p2', 'p3'],
    }),
  });
});

// Error handling
test('updateTeamHandler - returns 500 when update returns empty array', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { name: 'Updated Team' } } as unknown as Request;

  // Mock team exists
  mockSelectChain([[{ id: 't1', owner_id: 'u1' }]]);

  // Mock update returns empty array
  mockUpdateExecute([]);

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
      message: 'Failed to update team',
    }),
  );
});

test('updateTeamHandler - returns 500 on database error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 't1' }, body: { name: 'Updated Team' } } as unknown as Request;

  // Mock team exists
  mockSelectChain([[{ id: 't1', owner_id: 'u1' }]]);

  // Mock update throws error
  mockUpdateExecute([], true);

  await updateTeamHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
    }),
  );
});
