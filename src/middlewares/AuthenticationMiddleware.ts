import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { User, users } from '../models';
import { database, firebaseAuth } from '../services';

/**
 * Authentication middleware
 * Verifies Firebase token and loads user from database
 * NOTE: This does NOT perform real-time GamStop checks for performance reasons
 * Use GamstopCheckMiddleware for routes that need real-time verification
 */
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

    // Check database self-exclusion status
    // Note: This checks the cached status in the database, not real-time GamStop API
    // Real-time checks are performed by GamstopCheckMiddleware on specific routes
    if (user.is_self_excluded) {
      // Check if exclusion period has ended
      if (user.exclusion_ending && user.exclusion_ending < new Date()) {
        return res.status(403).send({
          error: 'Self-Exclusion Active',
          message:
            'You are currently self-excluded from betting activities. This restriction prevents you from accessing your account. If you believe this is an error, please contact support.',
          selfExcluded: true,
        });
      }
    }

    res.locals.user = user;

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`AUTHENTICATION ERROR: ${errorMessage} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
