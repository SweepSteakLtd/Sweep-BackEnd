import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { User, users } from '../models';
import { database, firebaseAuth } from '../services';

export const AuthenticateMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['x-auth-id']) {
    return res.status(401).send({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
  }
  try {
    const { email } = await firebaseAuth.verifyIdToken(req.headers['x-auth-id'] as string);

    const existingUser = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .execute();

    if (existingUser.length === 0) {
      return res.status(403).send({ error: 'Missing user', message: "User doesn't exist" });
    }
    const user: User = existingUser[0];
    if (user.is_self_excluded && user.exclusion_ending < new Date()) {
      return res.status(403).send({
        error: 'Excluded user',
        message: "User is self excluded and excludion period still didn't expire",
      });
    }

    res.locals.user = user;

    next();
  } catch (error: any) {
    console.log(`GET CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
