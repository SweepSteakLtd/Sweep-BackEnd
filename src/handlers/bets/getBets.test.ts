jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getBetsHandler } from './getBets';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any, shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          execute: async () => {
            throw new Error('select failed');
          },
        }),
        execute: async () => {
          throw new Error('select failed');
        },
      }),
    }));
  } else {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          execute: async () => result,
        }),
        execute: async () => result,
      }),
    }));
  }
};

test('getBetsHandler - returns all bets when no league_id provided', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  const bets = [
    { id: 'b1', owner_id: 'u1', league_id: 'l1', amount: 100 },
    { id: 'b2', owner_id: 'u2', league_id: 'l2', amount: 200 },
  ];
  mockSelectExecute(bets);

  await getBetsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: bets });
});

test('getBetsHandler - returns filtered bets when league_id provided', async () => {
  const res = mockResponse();
  const req = { query: { league_id: 'l1' } } as unknown as Request;

  const bets = [{ id: 'b1', owner_id: 'u1', league_id: 'l1', amount: 100 }];
  mockSelectExecute(bets);

  await getBetsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: bets });
});

test('getBetsHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, true);

  await getBetsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
