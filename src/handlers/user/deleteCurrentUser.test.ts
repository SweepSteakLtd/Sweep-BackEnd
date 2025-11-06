import { NextFunction, Request, Response } from 'express';
import { deleteCurrentUserHandler } from './deleteCurrentUser';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

test('deleteCurrentUserHandler - returns 204 on successful deletion', async () => {
  const res = mockResponse();
  const req = {} as Request;

  await deleteCurrentUserHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalledWith({ data: {}, is_mock: true });
});
