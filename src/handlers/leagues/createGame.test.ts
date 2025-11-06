jest.mock('@paralleldrive/cuid2', () => ({ createId: () => 'test-game-id' }));
jest.mock('nanoid', () => ({ customAlphabet: () => () => 'test-code' }));
jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { createLeagueHandler } from './createLeague';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any[]) => {
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

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent).toHaveProperty('data');
  expect(sent.data).toMatchObject({ id: 'test-game-id', name: 'Game A', entry_fee: 100 });
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

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});

// Authentication validation
test('createGameHandler - returns 403 if user is not authenticated', async () => {
  const res = mockResponse();
  // res.locals.user not set

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'User authentication is required',
    }),
  );
});

// Required field validation
test('createGameHandler - returns 422 when name is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: name',
    }),
  );
});

test('createGameHandler - returns 422 when entry_fee is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: entry_fee',
    }),
  );
});

test('createGameHandler - returns 422 when start_time is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: start_time',
    }),
  );
});

test('createGameHandler - returns 422 when end_time is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: end_time',
    }),
  );
});

test('createGameHandler - returns 422 when tournament_id is missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: tournament_id',
    }),
  );
});

// name validation
test('createGameHandler - returns 422 if name is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: '   ',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must be a non-empty string',
    }),
  );
});

test('createGameHandler - returns 422 if name exceeds 200 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'a'.repeat(201),
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must not exceed 200 characters',
    }),
  );
});

// description validation
test('createGameHandler - returns 422 if description exceeds 1000 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      description: 'a'.repeat(1001),
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'description must not exceed 1000 characters',
    }),
  );
});

// entry_fee validation
test('createGameHandler - returns 422 if entry_fee is not a number', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 'not-a-number',
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'entry_fee must be a number',
    }),
  );
});

test('createGameHandler - returns 422 if entry_fee is negative', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: -10,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'entry_fee must be non-negative',
    }),
  );
});

// contact_phone validation
test('createGameHandler - returns 422 if contact_phone is not in E.164 format', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      contact_phone: '1234567890', // missing +
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'contact_phone must be in E.164 format (e.g., +12345678901)',
    }),
  );
});

// contact_email validation
test('createGameHandler - returns 422 if contact_email is invalid', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      contact_email: 'not-an-email',
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'contact_email must be a valid email address',
    }),
  );
});

// max_participants validation
test('createGameHandler - returns 422 if max_participants is less than 2', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      max_participants: 1,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'max_participants must be at least 2',
    }),
  );
});

// Date validation
test('createGameHandler - returns 422 if start_time is invalid date', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: 'invalid-date',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'start_time must be a valid ISO 8601 date',
    }),
  );
});

test('createGameHandler - returns 422 if end_time is invalid date', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: 'invalid-date',
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'end_time must be a valid ISO 8601 date',
    }),
  );
});

test('createGameHandler - returns 422 if end_time is before start_time', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-17T00:00:00.000Z',
      end_time: '2025-10-16T00:00:00.000Z', // before start_time
      tournament_id: 't1',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'end_time must be after start_time',
    }),
  );
});

// tournament_id validation
test('createGameHandler - returns 422 if tournament_id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: '   ',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'tournament_id must be a non-empty string',
    }),
  );
});

// type validation
test('createGameHandler - returns 422 if type is invalid', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Game A',
      entry_fee: 100,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
      type: 'invalid',
    },
  } as unknown as Request;

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'type must be either public or private',
    }),
  );
});

// Private league with join code generation
test('createGameHandler - creates private league with join code', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };

  const req = {
    body: {
      name: 'Private Game',
      entry_fee: 50,
      start_time: '2025-10-16T00:00:00.000Z',
      end_time: '2025-10-17T00:00:00.000Z',
      tournament_id: 't1',
      type: 'private',
    },
  } as unknown as Request;

  mockSelectExecute([]); // No existing join code
  mockInsertExecute(false);

  await createLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent.data).toHaveProperty('join_code', 'test-code');
});
