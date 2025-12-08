jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { createPlayerHandler } from './createPlayer';

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
      values: () => ({
        execute: async () => ({}),
      }),
    }));
  }
};

test('createPlayerHandler - returns 422 when external_id is missing', async () => {
  const res = mockResponse();
  const req = {
    body: {
      level: 4,
      profile_id: 'profile_123',
      tournament_id: 'tournament_123',
    },
  } as unknown as Request;

  await createPlayerHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request body',
    message: 'Missing required field: external_id',
  });
});

test('createPlayerHandler - returns 422 when level is missing', async () => {
  const res = mockResponse();
  const req = {
    body: {
      external_id: 'ext_123',
      profile_id: 'profile_123',
      tournament_id: 'tournament_123',
    },
  } as unknown as Request;

  await createPlayerHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request body',
    message: 'Missing required field: level',
  });
});

test('createPlayerHandler - returns 422 when profile_id is missing', async () => {
  const res = mockResponse();
  const req = {
    body: {
      external_id: 'ext_123',
      level: 4,
      tournament_id: 'tournament_123',
    },
  } as unknown as Request;

  await createPlayerHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request body',
    message: 'Missing required field: profile_id',
  });
});

test('createPlayerHandler - returns 422 when tournament_id is missing', async () => {
  const res = mockResponse();
  const req = {
    body: {
      external_id: 'ext_123',
      level: 4,
      profile_id: 'profile_123',
    },
  } as unknown as Request;

  await createPlayerHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request body',
    message: 'Missing required field: tournament_id',
  });
});

test('createPlayerHandler - creates player with required fields and returns 201', async () => {
  const res = mockResponse();
  const req = {
    body: {
      external_id: 'ext_player_001',
      level: 4,
      profile_id: 'profile_tiger_woods',
      tournament_id: 'tournament_masters_2025',
    },
  } as unknown as Request;

  mockInsertExecute(false);

  await createPlayerHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        external_id: 'ext_player_001',
        level: 4,
        profile_id: 'profile_tiger_woods',
        tournament_id: 'tournament_masters_2025',
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }),
    }),
  );
});

test('createPlayerHandler - creates player with all fields and returns 201', async () => {
  const res = mockResponse();
  const req = {
    body: {
      external_id: 'ext_player_001',
      level: 4,
      current_score: 72,
      position: 5,
      attempts: { '1': 4, '2': 3 },
      missed_cut: false,
      odds: 15.5,
      profile_id: 'profile_tiger_woods',
      tournament_id: 'tournament_masters_2025',
    },
  } as unknown as Request;

  mockInsertExecute(false);

  await createPlayerHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        external_id: 'ext_player_001',
        level: 4,
        current_score: 72,
        position: 5,
        attempts: { '1': 4, '2': 3 },
        missed_cut: false,
        odds: 15.5,
        profile_id: 'profile_tiger_woods',
        tournament_id: 'tournament_masters_2025',
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }),
    }),
  );
});

test('createPlayerHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = {
    body: {
      external_id: 'ext_player_001',
      level: 4,
      profile_id: 'profile_tiger_woods',
      tournament_id: 'tournament_masters_2025',
    },
  } as unknown as Request;

  mockInsertExecute(true);

  await createPlayerHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }),
  );
});
