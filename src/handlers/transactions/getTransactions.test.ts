jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getTransactionsHandler } from './getTransactions';

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

test('getTransactionsHandler - returns all transactions when no type filter', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: {} } as unknown as Request;

  const transactions = [
    { id: 't1', user_id: 'u1', type: 'deposit', value: 100 },
    { id: 't2', user_id: 'u1', type: 'withdrawal', value: 50 },
  ];
  mockSelectExecute(transactions);

  await getTransactionsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: { deposited: 0, withdrawn: 0, netProfit: 0, transactions },
  });
});

test('getTransactionsHandler - returns filtered transactions by type', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: { type: 'deposit' } } as unknown as Request;

  const transactions = [{ id: 't1', user_id: 'u1', type: 'deposit', value: 100 }];
  mockSelectExecute(transactions);

  await getTransactionsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: { deposited: 0, withdrawn: 0, netProfit: 0, transactions },
  });
});

test('getTransactionsHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, true);

  await getTransactionsHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
