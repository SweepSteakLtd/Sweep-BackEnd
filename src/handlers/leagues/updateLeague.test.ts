jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { updateLeagueHandler } from './updateLeague';

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
    jest.spyOn(database as any, 'update').mockImplementation(() => ({
      set: () => ({ where: () => ({ execute: async () => result }) }),
    }));
  }
};

test('updateGameHandler - updates game and returns 200', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };
  const req = { params: { id: 'g1' }, body: { name: 'New Name' } } as unknown as Request;

  const finished = { id: 'g1', name: 'New Name' };
  mockUpdateExecute(finished);

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: finished });
});

test('updateGameHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };
  const req = { params: { id: 'g1' }, body: { name: 'New Name' } } as unknown as Request;

  mockUpdateExecute(null, true);

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});

// Authentication validation
test('updateGameHandler - returns 403 if user is not authenticated', async () => {
  const res = mockResponse();
  // res.locals.user not set
  const req = { params: { id: 'g1' }, body: { name: 'New Name' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'User authentication is required',
    }),
  );
});

// ID validation
test('updateGameHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: {}, body: { name: 'New Name' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required parameter: id',
    }),
  );
});

test('updateGameHandler - returns 422 when id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: '   ' }, body: { name: 'New Name' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'id must be a non-empty string',
    }),
  );
});

test('updateGameHandler - returns 422 when no updatable properties provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: {} } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'At least one valid property must be provided for update',
    }),
  );
});

// name validation
test('updateGameHandler - returns 422 if name is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { name: '   ' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must be a non-empty string',
    }),
  );
});

test('updateGameHandler - returns 422 if name exceeds 200 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { name: 'a'.repeat(201) } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must not exceed 200 characters',
    }),
  );
});

// description validation
test('updateGameHandler - returns 422 if description exceeds 1000 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {
    params: { id: 'g1' },
    body: { description: 'a'.repeat(1001) },
  } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'description must not exceed 1000 characters',
    }),
  );
});

// entry_fee validation
test('updateGameHandler - returns 422 if entry_fee is not a number', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { entry_fee: 'not-a-number' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'entry_fee must be a number',
    }),
  );
});

test('updateGameHandler - returns 422 if entry_fee is negative', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { entry_fee: -10 } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'entry_fee must be non-negative',
    }),
  );
});

// contact_phone validation
test('updateGameHandler - returns 422 if contact_phone is not in E.164 format', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { contact_phone: '1234567890' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'contact_phone must be in E.164 format (e.g., +12345678901)',
    }),
  );
});

// contact_email validation
test('updateGameHandler - returns 422 if contact_email is invalid', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {
    params: { id: 'g1' },
    body: { contact_email: 'not-an-email' },
  } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'contact_email must be a valid email address',
    }),
  );
});

// max_participants validation
test('updateGameHandler - returns 422 if max_participants is less than 2', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { max_participants: 1 } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'max_participants must be at least 2',
    }),
  );
});

// Date validation
test('updateGameHandler - returns 422 if start_time is invalid date', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { start_time: 'invalid-date' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'start_time must be a valid ISO 8601 date',
    }),
  );
});

test('updateGameHandler - returns 422 if end_time is invalid date', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { end_time: 'invalid-date' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'end_time must be a valid ISO 8601 date',
    }),
  );
});

test('updateGameHandler - returns 422 if end_time is before start_time', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {
    params: { id: 'g1' },
    body: {
      start_time: '2025-10-17T00:00:00.000Z',
      end_time: '2025-10-16T00:00:00.000Z', // before start_time
    },
  } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'end_time must be after start_time',
    }),
  );
});

// tournament_id validation
test('updateGameHandler - returns 422 if tournament_id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { tournament_id: '   ' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'tournament_id must be a non-empty string',
    }),
  );
});

// type validation
test('updateGameHandler - returns 422 if type is invalid', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' }, body: { type: 'invalid' } } as unknown as Request;

  await updateLeagueHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'type must be either public or private',
    }),
  );
});
