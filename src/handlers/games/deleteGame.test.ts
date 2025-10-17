jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { deleteGameHandler } from './deleteGame';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any) => {
  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({ where: () => ({ limit: () => ({ execute: async () => result }) }) }),
  }));
};

const mockDeleteExecute = (shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'delete').mockImplementation(() => ({
      where: () => ({
        execute: async () => {
          throw new Error('delete failed');
        },
      }),
    }));
  } else {
    jest.spyOn(database as any, 'delete').mockImplementation(() => ({ where: () => ({ execute: async () => ({}) }) }));
  }
};

test('deleteGameHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: {} } as unknown as Request;

  await deleteGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({ error: 'Invalid request body', message: 'required properties missing' });
});

test('deleteGameHandler - returns 403 when game not found or not owned', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { params: { id: 'g1' } } as unknown as Request;

  mockSelectExecute([]);

  await deleteGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith({ error: 'Missing game', message: "Game doesn't exist" });
});

test('deleteGameHandler - deletes and returns 200 when game exists and owned', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };
  const req = { params: { id: 'g1' } } as unknown as Request;

  mockSelectExecute([{ id: 'g1', owner_id: 'owner-1' }]);
  mockDeleteExecute(false);

  await deleteGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: {} });
});

test('deleteGameHandler - returns 500 on DB delete error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'owner-1' };
  const req = { params: { id: 'g1' } } as unknown as Request;

  mockSelectExecute([{ id: 'g1', owner_id: 'owner-1' }]);
  mockDeleteExecute(true);

  await deleteGameHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal Server Error' }));
});
