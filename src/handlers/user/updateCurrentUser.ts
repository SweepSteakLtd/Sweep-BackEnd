import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { User, users } from '../../models';
import { database } from '../../services';

/**
 * Update current user (authenticated endpoint)
 * @body first_name - string - optional
 * @body last_name - string - optional
 * @body email - string - optional
 * @body phone_number - string - optional
 * -----------------------------
 * @body bio - string - optional
 * @body profile_picture - string - optional
 * @body game_stop_id - string - optional
 * @body is_auth_verified - boolean - optional
 * @body is_identity_verified - boolean - optional
 * @body deposit_limit - number - optional
 * @body betting_limit - number - optional
 * @body payment_id - string - optional
 * @body current_balance - number - optional
 * @returns User
 */
export const updateCurrentUserHandler = async (req: Request<Partial<User>>, res: Response, next: NextFunction) => {
  try {
    const email = res.locals.email;
    const existingUser = await database.select().from(users).where(eq(users.email, email)).limit(1).execute();

    if (existingUser.length === 0) {
      console.log("[DEBUG]: failed to update user - user doesn't exist");
      return res.status(400).send({
        error: 'Invalid update request',
        message: 'Please make sure all necessary fields are provided and valid',
      });
    }

    const updatedUser: Partial<User> = {
      ...existingUser[0],
      bio: req.body.bio,
      profile_picture: req.body.profile_picture,
      game_stop_id: req.body.game_stop_id,
      // TODO: think if we should allow update of is_auth_verified from client or handle it on backend.
      // is_auth_verified: req.body.is_auth_verified,
      // TODO: part of gbg process
      // is_identity_verified: req.body.is_identity_verified,
      deposit_limit: req.body.deposit_limit,
      betting_limit: req.body.betting_limit,
      payment_id: req.body.payment_id,
      current_balance: req.body.current_balance,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone_number: req.body.phone_number,
      updated_at: new Date(),
    };

    await database.update(users).set(updatedUser).where(eq(users.email, email)).execute();

    return res.status(200).send({ data: updatedUser });
  } catch (error: any) {
    console.log(`[DEBUG]: UPDATE CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
