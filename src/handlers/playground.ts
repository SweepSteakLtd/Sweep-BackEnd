import { Request, Response, NextFunction } from 'express';

/**
 * This is not a REAL endpoint per se.
 * But if user need to test certain actions, you can send request to this endpoint.
 */

export const playgroundHandler = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).send({ message: 'OK' });
};
