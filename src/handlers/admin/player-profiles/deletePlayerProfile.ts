import { Request, Response, NextFunction } from 'express';

/**
 * Delete player profile (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deletePlayerProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(204).send({ data: {}, is_mock: true });
  } catch (error: any) {
    console.log(`DELETE PLAYER PROFILE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};