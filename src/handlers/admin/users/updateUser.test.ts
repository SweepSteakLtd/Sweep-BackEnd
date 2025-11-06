jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { updateUserHandler } from './updateUser';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = { user: { email: 'admin@example.com' } };
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any) => {
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

// ID validation
test('updateUserHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  const req = { params: {}, body: { first_name: 'John' } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request params',
    message: 'user id is required',
  });
});

test('updateUserHandler - returns 422 when id is empty string', async () => {
  const res = mockResponse();
  const req = { params: { id: '   ' }, body: { first_name: 'John' } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request params',
      message: 'id must be a non-empty string',
    }),
  );
});

// first_name validation
test('updateUserHandler - returns 422 when first_name is empty string', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { first_name: '   ' } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'first_name must be a non-empty string',
    }),
  );
});

test('updateUserHandler - returns 422 when first_name exceeds 100 characters', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { first_name: 'a'.repeat(101) } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'first_name must not exceed 100 characters',
    }),
  );
});

// last_name validation
test('updateUserHandler - returns 422 when last_name is empty string', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { last_name: '   ' } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'last_name must be a non-empty string',
    }),
  );
});

test('updateUserHandler - returns 422 when last_name exceeds 100 characters', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { last_name: 'a'.repeat(101) } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'last_name must not exceed 100 characters',
    }),
  );
});

// phone_number validation
test('updateUserHandler - returns 422 when phone_number is invalid', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { phone_number: '1234567890' } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'phone_number must be in E.164 format (e.g., +12345678901)',
    }),
  );
});

// nickname validation
test('updateUserHandler - returns 422 when nickname exceeds 50 characters', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { nickname: 'a'.repeat(51) } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'nickname must not exceed 50 characters',
    }),
  );
});

// bio validation
test('updateUserHandler - returns 422 when bio exceeds 500 characters', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { bio: 'a'.repeat(501) } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'bio must not exceed 500 characters',
    }),
  );
});

// profile_picture validation
test('updateUserHandler - returns 422 when profile_picture is not a valid URL', async () => {
  const res = mockResponse();
  const req = {
    params: { id: 'u1' },
    body: { profile_picture: 'not-a-url' },
  } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'profile_picture must be a valid URL',
    }),
  );
});

// betting_limit validation
test('updateUserHandler - returns 422 when betting_limit is negative', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { betting_limit: -100 } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'betting_limit must be non-negative',
    }),
  );
});

// current_balance validation
test('updateUserHandler - returns 422 when current_balance is negative', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { current_balance: -100 } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'current_balance must be non-negative',
    }),
  );
});

// deposit_limit validation
test('updateUserHandler - returns 422 when deposit_limit.daily exceeds weekly', async () => {
  const res = mockResponse();
  const req = {
    params: { id: 'u1' },
    body: { deposit_limit: { daily: 600, weekly: 500 } },
  } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'deposit_limit.daily cannot exceed weekly limit',
    }),
  );
});

test('updateUserHandler - returns 422 when deposit_limit.weekly exceeds monthly', async () => {
  const res = mockResponse();
  const req = {
    params: { id: 'u1' },
    body: { deposit_limit: { weekly: 1500, monthly: 1200 } },
  } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'deposit_limit.weekly cannot exceed monthly limit',
    }),
  );
});

// Boolean validation
test('updateUserHandler - returns 422 when is_admin is not boolean', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { is_admin: 'true' } } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'is_admin must be a boolean',
    }),
  );
});

// exclusion_ending validation
test('updateUserHandler - returns 422 when exclusion_ending is invalid date', async () => {
  const res = mockResponse();
  const req = {
    params: { id: 'u1' },
    body: { exclusion_ending: 'invalid-date' },
  } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'exclusion_ending must be a valid ISO 8601 date',
    }),
  );
});

test('updateUserHandler - returns 422 when no updatable properties', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: {} } as unknown as Request;

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'At least one property must be provided for update',
    }),
  );
});

test('updateUserHandler - updates user and returns 200', async () => {
  const res = mockResponse();
  const req = {
    params: { id: 'u1' },
    body: { first_name: 'John', is_admin: true },
  } as unknown as Request;

  const updatedUser = { id: 'u1', email: 'admin@example.com', first_name: 'John', is_admin: true };
  mockUpdateExecute(false);
  mockSelectExecute([updatedUser]);

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: updatedUser });
});

test('updateUserHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { params: { id: 'u1' }, body: { first_name: 'John' } } as unknown as Request;

  mockUpdateExecute(true);

  await updateUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
