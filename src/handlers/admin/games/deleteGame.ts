import { NextFunction, Request, Response } from 'express';

/**
 * Delete game (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deleteGameAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(204).send({ data: {}, is_mock: true });
  } catch (error: any) {
    console.log(`DELETE GAME ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteGameAdminHandler.apiDescription = {
  responses: {
    204: { description: '204 No Content' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
};
