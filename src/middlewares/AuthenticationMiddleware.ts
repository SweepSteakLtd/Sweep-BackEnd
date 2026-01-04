import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import {
  checkGamstopRegistration,
  handleGamstopError,
} from '../integrations/Gamstop/gamstop';
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

    // Perform real-time GamStop check during login
    if (user.date_of_birth && user.address && user.phone_number) {
      const address = user.address as any;
      try {
        console.log(`[DEBUG] Performing GamStop check during login for user ${user.email}`);
        const gamstopResult = await checkGamstopRegistration({
          first_name: user.first_name,
          last_name: user.last_name,
          date_of_birth: user.date_of_birth,
          email: user.email,
          postcode: address.postcode,
          phone: user.phone_number,
        });

        // Update user's self-exclusion status in database
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

          // Update the user object with the new status
          user.is_self_excluded = updatedSelfExclusionStatus;
          user.game_stop_id = gamstopResult.registration_id || user.game_stop_id;
        }

        // Block login if user is self-excluded
        if (updatedSelfExclusionStatus) {
          console.log(
            `[DEBUG] User ${user.email} is self-excluded via GamStop - blocking login`,
          );
          return res.status(403).send({
            error: 'Self-Exclusion Active',
            message:
              'You are currently self-excluded from betting activities through GamStop. This restriction prevents you from accessing your account. If you believe this is an error, please contact support.',
            selfExcluded: true,
          });
        }

        console.log(`[DEBUG] GamStop check passed for user ${user.email} - not self-excluded`);
      } catch (error: any) {
        console.error(`[DEBUG] GamStop check failed during login for ${user.email}:`, error.message);
        const gamstopError = handleGamstopError(error);

        // If GamStop service is unavailable, log error but allow login to proceed
        // This prevents service outages from blocking all users
        console.warn(
          `[WARN] GamStop service unavailable during login - allowing user to proceed. Error: ${gamstopError.message}`,
        );
      }
    } else {
      console.log(
        `[DEBUG] Skipping GamStop check for user ${user.email} - missing required data (date_of_birth, address, or phone_number)`,
      );
    }

    // Legacy check: Also check database exclusion_ending date if user is marked as self-excluded
    if (user.is_self_excluded && user.exclusion_ending < new Date()) {
      return res.status(403).send({
        error: 'Excluded user',
        message: "User is self excluded and exclusion period still didn't expire",
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
