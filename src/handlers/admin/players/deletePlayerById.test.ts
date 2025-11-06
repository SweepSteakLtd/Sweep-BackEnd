jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { deletePlayerByIdHandler } from './deletePlayerById';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

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

test('deletePlayerByIdHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  const req = { params: {} } as unknown as Request;

  await deletePlayerByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request params',
    message: 'required properties missing',
  });
});

test('deletePlayerByIdHandler - deletes player and returns 204', async () => {
  const res = mockResponse();
  const req = { params: { id: 'p1' } } as unknown as Request;

  mockDeleteExecute(false);

  await deletePlayerByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalledWith({ data: {} });
});

test('deletePlayerByIdHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { params: { id: 'p1' } } as unknown as Request;

  mockDeleteExecute(true);

  await deletePlayerByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
