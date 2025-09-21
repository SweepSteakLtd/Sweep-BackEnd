import { Request, Response, NextFunction } from 'express';

/**
 * Delete bet (authenticated endpoint)
 * @params id - required
 * @returns void
 */
export const deleteBetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(204).send({ data: {}, is_mock: true });
  } catch (error: any) {
    console.log(`DELETE BET ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};