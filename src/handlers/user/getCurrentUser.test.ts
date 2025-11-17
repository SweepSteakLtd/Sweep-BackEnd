jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { getCurrentUserHandler } from './getCurrentUser';

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

test('getCurrentUserHandler - returns 200 and user when res.locals.user is present', async () => {
  const res = mockResponse();
  const user = {
    id: 'u1',
    email: 'a@b.com',
    first_name: 'Test',
    deposit_limit: { daily: 100, weekly: 500, monthly: 1000 },
  };
  (res as any).locals.user = user;

  const req = {} as Request;

  await getCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: user });
});

test('getCurrentUserHandler - returns 401 when no user in res.locals', async () => {
  const res = mockResponse();
  // no res.locals.user

  const req = {} as Request;

  await getCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.send).toHaveBeenCalledWith({ message: 'Failed getting the user' });
});
