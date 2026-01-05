import { NextFunction, Request, Response } from 'express';
import { User } from '../models';

/**
 * Middleware to check if user is self-excluded via GamStop
 * Prevents self-excluded users from creating teams, placing bets, or joining leagues
 * Returns 403 Forbidden if user is self-excluded
 */
export const CheckSelfExclusionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = res.locals.user as User;

    if (!user) {
      console.log('[DEBUG] CheckSelfExclusionMiddleware: No user found in res.locals');
      return res.status(401).send({
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    if (user.is_self_excluded === true) {
      console.log(
        `[DEBUG] Self-excluded user ${user.id} (${user.email}) attempted to perform a betting action`,
      );

      return res.status(403).send({
        error: 'Self-Exclusion Active',
        message:
          'You are currently self-excluded from betting activities through GamStop. This restriction prevents you from placing bets, creating teams, or joining leagues. If you believe this is an error, please contact support.',
        selfExcluded: true,
      });
    }

    console.log(`[DEBUG] User ${user.id} self-exclusion check passed - not self-excluded`);

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`CHECK SELF-EXCLUSION ERROR: ${errorMessage} 🛑`, error);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while checking self-exclusion status',
    });
  }
};
