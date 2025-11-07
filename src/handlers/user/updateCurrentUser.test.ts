jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { updateCurrentUserHandler } from './updateCurrentUser';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => {
  jest.resetAllMocks();
});

const mockSelectExecute = (result: any) => {
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => ({
          execute: async () => result,
        }),
        execute: async () => result,
      }),
    }),
  }));
};

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

test('updateCurrentUserHandler - updates user and returns 200', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'john.doe@example.com' };

  const req = {
    body: {
      first_name: 'Johnny',
      bio: 'Updated bio',
    },
  } as unknown as Request;

  const finished = {
    id: 'u1',
    email: 'john.doe@example.com',
    first_name: 'Johnny',
    bio: 'Updated bio',
  };
  mockUpdateExecute(finished);
  mockSelectExecute([finished]);

  await updateCurrentUserHandler(req, res, mockNext);

  expect(database.update).toBeDefined();
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: finished });
});

test('updateCurrentUserHandler - returns 422 when no allowed properties provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'john.doe@example.com' };

  const req = {
    body: {
      some_random_field: 'nope',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request body',
    message: 'required properties missing',
  });
});

test('updateCurrentUserHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'john.error@example.com' };

  const req = {
    body: {
      first_name: 'John',
    },
  } as unknown as Request;

  mockUpdateExecute(null, true);

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }),
  );
});

// Authentication validation tests
test('updateCurrentUserHandler - returns 403 if user is not authenticated', async () => {
  const res = mockResponse();
  // res.locals.user is not set

  const req = {
    body: {
      first_name: 'John',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'User authentication is required',
    }),
  );
});

// first_name validation tests
test('updateCurrentUserHandler - returns 422 if first_name is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      first_name: '   ',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'first_name must be a non-empty string',
    }),
  );
});

test('updateCurrentUserHandler - returns 422 if first_name exceeds 100 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      first_name: 'a'.repeat(101),
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'first_name must not exceed 100 characters',
    }),
  );
});

// last_name validation tests
test('updateCurrentUserHandler - returns 422 if last_name is empty string', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      last_name: '   ',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'last_name must be a non-empty string',
    }),
  );
});

test('updateCurrentUserHandler - returns 422 if last_name exceeds 100 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      last_name: 'a'.repeat(101),
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'last_name must not exceed 100 characters',
    }),
  );
});

// phone_number validation tests
test('updateCurrentUserHandler - returns 422 if phone_number is not in E.164 format', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      phone_number: '1234567890', // missing +
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'phone_number must be in E.164 format (e.g., +12345678901)',
    }),
  );
});

// nickname validation tests
test('updateCurrentUserHandler - returns 422 if nickname exceeds 50 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      nickname: 'a'.repeat(51),
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'nickname must not exceed 50 characters',
    }),
  );
});

// bio validation tests
test('updateCurrentUserHandler - returns 422 if bio exceeds 500 characters', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      bio: 'a'.repeat(501),
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'bio must not exceed 500 characters',
    }),
  );
});

// profile_picture validation tests
test('updateCurrentUserHandler - returns 422 if profile_picture is not a valid URL', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      profile_picture: 'not-a-valid-url',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'profile_picture must be a valid URL',
    }),
  );
});

// betting_limit validation tests
test('updateCurrentUserHandler - returns 422 if betting_limit is not a number', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      betting_limit: 'not-a-number',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'betting_limit must be a number',
    }),
  );
});

test('updateCurrentUserHandler - returns 422 if betting_limit is negative', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      betting_limit: -100,
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'betting_limit must be non-negative',
    }),
  );
});

// current_balance validation tests
test('updateCurrentUserHandler - returns 422 if current_balance is not a number', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      current_balance: 'not-a-number',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'current_balance must be a number',
    }),
  );
});

test('updateCurrentUserHandler - returns 422 if current_balance is negative', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      current_balance: -50,
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'current_balance must be non-negative',
    }),
  );
});

// deposit_limit validation tests
test('updateCurrentUserHandler - returns 422 if deposit_limit is not an object', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      deposit_limit: 'not-an-object',
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'deposit_limit must be an object with daily, weekly, and monthly properties',
    }),
  );
});

test('updateCurrentUserHandler - successfully updates user with valid deposit_limit', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const finished = {
    id: 'u1',
    email: 'test@example.com',
    deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
  };
  mockUpdateExecute(finished);
  mockSelectExecute([finished]);

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: finished });
});

// address validation tests
test('updateCurrentUserHandler - returns 422 if address is missing required fields', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      address: {
        street_name: 'Main St',
        // missing postal_code, city, country_code
      },
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'address.postal_code is required',
    }),
  );
});

test('updateCurrentUserHandler - returns 422 if address.country_code is invalid format', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      address: {
        street_name: 'Main St',
        postal_code: '12345',
        city: 'New York',
        country_code: 'USA', // should be 2 letters
      },
    },
  } as unknown as Request;

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'address.country_code must be a 2-letter uppercase country code (e.g., US, GB, CA)',
    }),
  );
});

test('updateCurrentUserHandler - successfully updates user with valid address', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1', email: 'test@example.com' };

  const req = {
    body: {
      address: {
        street_name: 'Main St',
        street_number: 123,
        unit: 'Apt 4B',
        postal_code: '12345',
        city: 'New York',
        state_province: 'NY',
        country_code: 'US',
      },
    },
  } as unknown as Request;

  const finished = {
    id: 'u1',
    email: 'test@example.com',
    address: {
      street_name: 'Main St',
      street_number: 123,
      unit: 'Apt 4B',
      postal_code: '12345',
      city: 'New York',
      state_province: 'NY',
      country_code: 'US',
    },
  };
  mockUpdateExecute(finished);
  mockSelectExecute([finished]);

  await updateCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: finished });
});
