import { Request, Response, NextFunction } from 'express';

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