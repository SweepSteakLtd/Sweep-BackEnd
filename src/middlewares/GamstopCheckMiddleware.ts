import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { checkGamstopRegistration, handleGamstopError } from '../integrations/Gamstop/gamstop';
import { Address, User, users } from '../models';
import { database } from '../services';

/**
 * Middleware to perform real-time GamStop check
 * This should ONLY be used on specific endpoints like /users/me to avoid performance issues
 * Do NOT apply this to all authenticated routes as it adds significant latency
 */
export const GamstopCheckMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = res.locals.user as User;

    if (!user || !user.id) {
      console.log('[DEBUG] GamstopCheckMiddleware: No user found in res.locals');
      return res.status(401).send({
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    // Only perform GamStop check if user has required data
    if (user.date_of_birth && user.address && user.phone_number) {
      const address = user.address as Address;

      try {
        console.log(`[DEBUG] Performing GamStop check for user ${user.email}`);
        const gamstopResult = await checkGamstopRegistration({
          first_name: user.first_name,
          last_name: user.last_name,
          date_of_birth: user.date_of_birth,
          email: user.email,
          postcode: address.postcode,
          phone: user.phone_number,
        });

        // Update user's self-exclusion status in database if changed
        const updatedSelfExclusionStatus = gamstopResult.is_registered;
        if (user.is_self_excluded !== updatedSelfExclusionStatus) {
          console.log(
            `[DEBUG] GamStop status changed for user ${user.email}: ${user.is_self_excluded} -> ${updatedSelfExclusionStatus}`,
          );
          await database
            .update(users)
            .set({
              is_self_excluded: updatedSelfExclusionStatus,
              game_stop_id: gamstopResult.registration_id || user.game_stop_id,
              updated_at: new Date(),
            })
            .where(eq(users.id, user.id))
            .execute();

          // Update the user object in res.locals with the new status
          user.is_self_excluded = updatedSelfExclusionStatus;
          user.game_stop_id = gamstopResult.registration_id || user.game_stop_id;
          res.locals.user = user;
        }

        // Block access if user is self-excluded
        if (updatedSelfExclusionStatus) {
          console.log(
            `[DEBUG] User ${user.email} is self-excluded via GamStop - blocking access`,
          );
          return res.status(403).send({
            error: 'Self-Exclusion Active',
            message:
              'You are currently self-excluded from betting activities through GamStop. This restriction prevents you from accessing your account. If you believe this is an error, please contact support.',
            selfExcluded: true,
          });
        }

        console.log(`[DEBUG] GamStop check passed for user ${user.email} - not self-excluded`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[DEBUG] GamStop check failed for ${user.email}:`, errorMessage);
        const gamstopError = handleGamstopError(error);

        // If GamStop service is unavailable, log error but allow request to proceed
        // This prevents service outages from blocking all users
        console.warn(
          `[WARN] GamStop service unavailable - allowing user to proceed. Error: ${gamstopError.message}`,
        );
      }
    } else {
      console.log(
        `[DEBUG] Skipping GamStop check for user ${user.email} - missing required data (date_of_birth, address, or phone_number)`,
      );
    }

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`GAMSTOP CHECK MIDDLEWARE ERROR: ${errorMessage} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while checking GamStop status',
    });
  }
};
