import { NextFunction, Request, Response } from 'express';

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

deleteBetHandler.apiDescription = {
  responses: {
    204: { description: '204 No Content' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
};
