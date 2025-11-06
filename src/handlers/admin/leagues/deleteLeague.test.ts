jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { deleteLeagueAdminHandler } from './deleteLeague';

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
    from: () => ({
      where: () => ({
        limit: () => ({
          execute: async () => result,
        }),
      }),
    }),
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
    jest.spyOn(database as any, 'delete').mockImplementation(() => ({
      where: () => ({
        execute: async () => ({}),
      }),
    }));
  }
};

test('deleteLeagueAdminHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  const req = { params: {} } as unknown as Request;

  await deleteLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'Missing required parameter: id',
    }),
  );
});

test('deleteLeagueAdminHandler - returns 422 when id is empty string', async () => {
  const res = mockResponse();
  const req = { params: { id: '   ' } } as unknown as Request;

  await deleteLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid request body',
      message: 'id must be a non-empty string',
    }),
  );
});

test('deleteLeagueAdminHandler - returns 404 when league not found', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' } } as unknown as Request;

  mockSelectExecute([]);
  mockDeleteExecute(false);

  await deleteLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'League not found',
      message: "League doesn't exist",
    }),
  );
});

test('deleteLeagueAdminHandler - deletes league and returns 204', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' } } as unknown as Request;

  mockSelectExecute([{ id: 'l1', name: 'Test League' }]);
  mockDeleteExecute(false);

  await deleteLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalledWith({ data: {} });
});

test('deleteLeagueAdminHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { params: { id: 'l1' } } as unknown as Request;

  mockSelectExecute([{ id: 'l1', name: 'Test League' }]);
  mockDeleteExecute(true);

  await deleteLeagueAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
