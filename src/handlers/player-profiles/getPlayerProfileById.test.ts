jest.mock('../../services');

import { Request, Response } from 'express';
import { database } from '../../services';
import { getPlayerProfileByIdHandler } from './getPlayerProfileById';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any, shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            execute: async () => {
              throw new Error('select failed');
            },
          }),
        }),
      }),
    }));
  } else {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            execute: async () => result,
          }),
        }),
      }),
    }));
  }
};

// ID validation
test('getPlayerProfileByIdHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: {} } as unknown as Request;

  await getPlayerProfileByIdHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required parameter: id',
    }),
  );
});

test('getPlayerProfileByIdHandler - returns 422 when id is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: '   ' } } as unknown as Request;

  await getPlayerProfileByIdHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'id must be a non-empty string',
    }),
  );
});

// Not found
test('getPlayerProfileByIdHandler - returns 404 when player profile not found', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'profile_nonexistent' } } as unknown as Request;

  mockSelectExecute([]);

  await getPlayerProfileByIdHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Not found',
      message: 'Player profile not found',
    }),
  );
});

// Success case
test('getPlayerProfileByIdHandler - returns player profile when found', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'profile_abc123' } } as unknown as Request;

  const profile = {
    id: 'profile_abc123',
    external_id: 'ext_tiger_woods',
    first_name: 'Tiger',
    last_name: 'Woods',
    country: 'USA',
    age: 48,
    ranking: 1250,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
  };

  mockSelectExecute([profile]);

  await getPlayerProfileByIdHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: profile,
  });
});

// Error handling
test('getPlayerProfileByIdHandler - returns 500 on database error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'profile_abc123' } } as unknown as Request;

  mockSelectExecute(null, true);

  await getPlayerProfileByIdHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
    }),
  );
});
