jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getTournamentsHandler } from './getTournaments';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

test('getTournamentsHandler - returns empty array when no tournaments', async () => {
  const res = mockResponse();
  const req = {} as Request;

  // Mock to return empty tournaments array - this will cause Promise.all([]) which resolves to []
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => Promise.resolve([]),
  }));

  await getTournamentsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: [] });
});

test('getTournamentsHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = {} as Request;

  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      execute: async () => {
        throw new Error('select failed');
      },
    }),
  }));

  await getTournamentsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
