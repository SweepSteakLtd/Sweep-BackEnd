import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { User, users } from '../models';
import { database, firebaseAuth } from '../services';

export const AuthenticateAdminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.headers['x-auth-id']) {
    return res.status(401).send({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
  }
  try {
    const { email } = await firebaseAuth.verifyIdToken(req.headers['x-auth-id'] as string);

    const existingUser: User[] = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .execute();

    if (existingUser.length === 0) {
      return res.status(403).send({ error: 'Missing user', message: "User doesn't exist" });
    }

    if (!existingUser[0].is_admin) {
      return res.status(403).send({ error: 'Forbidden', message: 'User is not an admin' });
    }

    res.locals.user = existingUser[0];

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`GET CURRENT USER ERROR: ${errorMessage} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
