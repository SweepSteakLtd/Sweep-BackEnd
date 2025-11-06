jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getActivityHandler } from './getActivities';

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
      }),
    }));
  } else {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          execute: async () => result,
        }),
      }),
    }));
  }
};

test('getActivityHandler - returns activities with calculated totals', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: {} } as unknown as Request;

  const transactions = [
    { id: 't1', user_id: 'u1', type: 'deposit', value: 100 },
    { id: 't2', user_id: 'u1', type: 'deposit', value: 50 },
    { id: 't3', user_id: 'u1', type: 'withdrawal', value: 30 },
  ];
  mockSelectExecute(transactions);

  await getActivityHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: {
      deposited: 150,
      withdrawn: 30,
      net_profit: -120,
      transactions,
    },
  });
});

test('getActivityHandler - filters by timestamp when provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const timestamp = Date.now().toString();
  const req = { query: { timestamp } } as unknown as Request;

  const transactions = [{ id: 't1', user_id: 'u1', type: 'deposit', value: 100 }];
  mockSelectExecute(transactions);

  await getActivityHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: {
      deposited: 100,
      withdrawn: 0,
      net_profit: -100,
      transactions,
    },
  });
});

test('getActivityHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, true);

  await getActivityHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
