jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getAllTeamsHandler } from './getAllTeams';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

test('getAllTeamsHandler - returns empty array when user has no bets', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {} as Request;

  // Mock to return empty bets array - this will cause Promise.all([]) which resolves to []
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => Promise.resolve([]),
    }),
  }));

  await getAllTeamsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: [] });
});

test('getAllTeamsHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = {} as Request;

  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        execute: async () => {
          throw new Error('select failed');
        },
      }),
    }),
  }));

  await getAllTeamsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
