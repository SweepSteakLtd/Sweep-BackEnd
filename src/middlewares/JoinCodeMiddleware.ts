import { eq, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { leagues, User } from '../models';
import { database } from '../services';

/**
 * Middleware to validate access to private leagues using join_code
 * - For private leagues: requires valid join_code in query params, otherwise returns 403
 * - For public leagues: allows access without join_code
 * - Sets res.locals.is_private_league based on league type
 * - Adds authenticated user to joined_players array when accessing with valid join_code
 */
export const JoinCodeMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { join_code } = req.query;

    const leagueId = req.params.id || req.body?.league_id;

    if (!leagueId) {
      return next();
    }

    const existingLeague = await database
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1)
      .execute();

    if (existingLeague.length === 0) {
      return next();
    }

    const league = existingLeague[0];

    const user: User = res.locals.user;
    if (league.joined_players && league.joined_players.includes(user.id)) {
      console.log(`[DEBUG]: User has already joined the league`);
      return next();
    }

    if (league.type === 'private') {
      if (!join_code) {
        console.log(`[DEBUG]: Private league access denied - no join_code provided`);
        return res.status(403).send({
          error: 'Forbidden',
          message: 'This is a private league. A valid join code is required to access it.',
        });
      }

      if (league.join_code !== join_code) {
        console.log(`[DEBUG]: Private league access denied - invalid join_code`);
        return res.status(403).send({
          error: 'Forbidden',
          message: 'Invalid join code for this private league.',
        });
      }

      res.locals.is_private_league = true;
      console.log(`[DEBUG]: Private league access granted with join_code: ${join_code}`);

      // Add user to joined_players if authenticated and not already in the list
      if (user && user.id) {
        const joinedPlayers = league.joined_players || [];

        if (!joinedPlayers.includes(user.id)) {
          await database
            .update(leagues)
            .set({
              joined_players: sql`array_append(${leagues.joined_players}, ${user.id})`,
              updated_at: new Date(),
            })
            .where(eq(leagues.id, leagueId))
            .execute();

          console.log(`[DEBUG]: Added user ${user.id} to league ${leagueId} joined_players`);
        }
      }
    } else {
      res.locals.is_private_league = false;
      console.log(`[DEBUG]: Public league access granted`);
    }

    next();
  } catch (error: any) {
    console.log(`[DEBUG]: JOIN CODE MIDDLEWARE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
