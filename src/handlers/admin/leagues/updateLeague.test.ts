jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { updateLeagueAdminHandler } from './updateLeague';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = { user: { id: 'admin-1' } };
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
      set: () => ({
        where: () => ({
          execute: async () => result,
        }),
      }),
    }));
  }
};

// ID validation
test('updateLeagueAdminHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  const req = { params: {}, body: { name: 'New Name' } } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required parameter: id',
    }),
  );
});

test('updateLeagueAdminHandler - returns 422 when id is empty string', async () => {
  const res = mockResponse();
  const req = { params: { id: '   ' }, body: { name: 'New Name' } } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'id must be a non-empty string',
    }),
  );
});

test('updateLeagueAdminHandler - returns 422 when no properties to update', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' }, body: {} } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'At least one valid property must be provided for update',
    }),
  );
});

// name validation
test('updateLeagueAdminHandler - returns 422 when name is empty string', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' }, body: { name: '   ' } } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must be a non-empty string',
    }),
  );
});

test('updateLeagueAdminHandler - returns 422 when name exceeds 200 characters', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' }, body: { name: 'a'.repeat(201) } } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'name must not exceed 200 characters',
    }),
  );
});

// entry_fee validation
test('updateLeagueAdminHandler - returns 422 when entry_fee is negative', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' }, body: { entry_fee: -10 } } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'entry_fee must be non-negative',
    }),
  );
});

// Date validation
test('updateLeagueAdminHandler - returns 422 when start_time is invalid', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' }, body: { start_time: 'invalid-date' } } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'start_time must be a valid ISO 8601 date',
    }),
  );
});

test('updateLeagueAdminHandler - returns 422 when end_time is before start_time', async () => {
  const res = mockResponse();
  const req = {
    params: { id: 'l1' },
    body: {
      start_time: '2025-10-17T00:00:00.000Z',
      end_time: '2025-10-16T00:00:00.000Z',
    },
  } as unknown as Request;

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'end_time must be after start_time',
    }),
  );
});

test('updateLeagueAdminHandler - updates league and returns 200', async () => {
  const res = mockResponse();
  const req = {
    params: { id: 'l1' },
    body: { name: 'Updated Name', is_featured: true },
  } as unknown as Request;

  const updatedLeague = { id: 'l1', name: 'Updated Name', is_featured: true };
  mockUpdateExecute(updatedLeague);

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: updatedLeague });
});

test('updateLeagueAdminHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' }, body: { name: 'Updated Name' } } as unknown as Request;

  mockUpdateExecute(null, true);

  await updateLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
