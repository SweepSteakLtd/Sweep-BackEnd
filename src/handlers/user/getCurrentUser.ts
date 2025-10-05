import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../models';
import { database } from '../../services';
/**
 * Get current user (authenticated endpoint)
 * @returns User
 */
export const getCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = res.locals.email;
    const existingUser = await database.select().from(users).where(eq(users.email, email)).limit(1).execute();

    if (existingUser.length > 0) {
      return res.status(200).send({ data: existingUser[0] });
    }

    return res.status(401).send({ message: 'Failed getting the user' });
  } catch (error: any) {
    console.log(`GET CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
