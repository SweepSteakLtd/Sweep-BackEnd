jest.mock('@paralleldrive/cuid2', () => ({ createId: () => 'test-id' }));
jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { createUserHandler } from './createUser';

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
      }),
    }),
  }));
};

const mockInsertExecute = (result: any, shouldThrow = false) => {
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
        execute: async () => result,
      }),
    }));
  }
};

test('createUserHandler - creates a new user and returns 201', async () => {
  mockSelectExecute([]); // no existing users
  mockInsertExecute({ affectedRows: 1 });

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      bio: 'Golf enthusiast',
      profile_picture: 'https://example.com/avatar.jpg',
      phone_number: '+1234567890',
      deposit_limit: {
        daily: 100,
        weekly: 500,
        monthly: 1200,
      },
      betting_limit: 2400,
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'john.doe@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent).toHaveProperty('data');
  expect(sent.data).toMatchObject({
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
  });
  expect(sent.data.id).toBe('test-id');
});

test('createUserHandler - returns 400 if user with email exists', async () => {
  mockSelectExecute([{ id: 'existing-id', email: 'john.doe@example.com' }]);

  const req = {
    body: {},
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'john.doe@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Bad Request',
      message: 'User with this email already exists',
    }),
  );
});

test('createUserHandler - returns 500 on DB insert error', async () => {
  mockSelectExecute([]); // no existing users
  mockInsertExecute(null, true); // make insert throw

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: {
        daily: 100,
        weekly: 500,
        monthly: 1200,
      },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'john.error@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }),
  );
});

// Email validation tests
test('createUserHandler - returns 403 if email is missing from authentication', async () => {
  const req = { body: {} } as unknown as Request;
  const res = mockResponse();
  // res.locals.email is not set

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Forbidden',
      message: 'Valid email is required from authentication',
    }),
  );
});

test('createUserHandler - returns 422 if email format is invalid', async () => {
  const req = { body: {} } as unknown as Request;
  const res = mockResponse();
  (res as any).locals.email = 'invalid-email-format';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'email must be a valid email address',
    }),
  );
});

// Required fields tests
test('createUserHandler - returns 422 if first_name is missing', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: first_name',
    }),
  );
});

test('createUserHandler - returns 422 if last_name is missing', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: last_name',
    }),
  );
});

test('createUserHandler - returns 422 if phone_number is missing', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: phone_number',
    }),
  );
});

test('createUserHandler - returns 422 if deposit_limit is missing', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required field: deposit_limit',
    }),
  );
});

// first_name validation tests
test('createUserHandler - returns 422 if first_name is empty string', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: '   ',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'first_name must be a non-empty string',
    }),
  );
});

test('createUserHandler - returns 422 if first_name exceeds 100 characters', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'a'.repeat(101),
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'first_name must not exceed 100 characters',
    }),
  );
});

// last_name validation tests
test('createUserHandler - returns 422 if last_name is empty string', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: '   ',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'last_name must be a non-empty string',
    }),
  );
});

test('createUserHandler - returns 422 if last_name exceeds 100 characters', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'a'.repeat(101),
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'last_name must not exceed 100 characters',
    }),
  );
});

// phone_number validation tests
test('createUserHandler - returns 422 if phone_number is not in E.164 format', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '1234567890', // missing +
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'phone_number must be in E.164 format (e.g., +12345678901)',
    }),
  );
});

// Optional field validation tests
test('createUserHandler - returns 422 if nickname exceeds 50 characters', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      nickname: 'a'.repeat(51),
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'nickname must not exceed 50 characters',
    }),
  );
});

test('createUserHandler - returns 422 if bio exceeds 500 characters', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      bio: 'a'.repeat(501),
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'bio must not exceed 500 characters',
    }),
  );
});

test('createUserHandler - returns 422 if profile_picture is not a valid URL', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      profile_picture: 'not-a-valid-url',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'profile_picture must be a valid URL',
    }),
  );
});

// deposit_limit validation tests
test('createUserHandler - returns 422 if deposit_limit is not an object', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: 'not-an-object',
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'deposit_limit must be an object with daily, weekly, and monthly properties',
    }),
  );
});

// betting_limit validation tests
test('createUserHandler - returns 422 if betting_limit is negative', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
      betting_limit: -100,
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'betting_limit must be non-negative',
    }),
  );
});

// current_balance validation tests
test('createUserHandler - returns 422 if current_balance is negative', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
      current_balance: -50,
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'current_balance must be non-negative',
    }),
  );
});

// address validation tests
test('createUserHandler - returns 422 if address is missing required fields', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
      address: {
        street_name: 'Main St',
        // missing postal_code, city, country_code
      },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'address.postal_code is required',
    }),
  );
});

test('createUserHandler - returns 422 if address.country_code is invalid format', async () => {
  mockSelectExecute([]);

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
      address: {
        street_name: 'Main St',
        postal_code: '12345',
        city: 'New York',
        country_code: 'USA', // should be 2 letters
      },
    },
  } as unknown as Request;

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'address.country_code must be a 2-letter uppercase country code (e.g., US, GB, CA)',
    }),
  );
});

test('createUserHandler - successfully creates user with valid address', async () => {
  mockSelectExecute([]);
  mockInsertExecute({ affectedRows: 1 });

  const req = {
    body: {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      deposit_limit: { daily: 100, weekly: 500, monthly: 1200 },
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

  const res = mockResponse();
  (res as any).locals.email = 'test@example.com';

  await createUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent).toHaveProperty('data');
  expect(sent.data.address).toMatchObject({
    street_name: 'Main St',
    street_number: 123,
    city: 'New York',
    country_code: 'US',
  });
});
