import { NextFunction, Request, Response } from 'express';
import { firebaseAuth } from '../services';

// this doesn't check for user existence in db, only verifies email from token and returns it
export const AuthenticateEmailMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['x-auth-id']) {
    return res.status(401).send({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
  }
  try {
    const { email } = await firebaseAuth.verifyIdToken(req.headers['x-auth-id'] as string);

    if (!email) {
      console.log('[DEBUG]: AUTH EMAIL MIDDLEWARE - NO EMAIL IN TOKEN 🛑', { token: req.headers['x-auth-id'] });
      return res.status(403).send({ error: 'Missing user', message: 'User not authenticated' });
    }

    res.locals.email = email;

    next();
  } catch (error: any) {
    console.log(`[DEBUG] GET CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
