import { and, eq, gte, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets, leagues, User } from '../models';
import { database } from '../services';

const MONTHLY_BET_LIMIT_GBP = 500000; // 5000 GBP in pence

export const CheckMonthlyBetLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = res.locals.user as User;
    const userId = user.id;
    const leagueId = req.params.id || req.params.league_id || req.body?.league_id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const leagueEntryFee = await database
      .select(leagues)
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .execute();

    const result = await database
      .select({
        total: sql<number>`COALESCE(SUM(${bets.amount}), 0)`,
      })
      .from(bets)
      .where(and(eq(bets.owner_id, userId), gte(bets.created_at, startOfMonth)))
      .execute();

    const totalBetAmount = Number(result[0]?.total || 0);
    const newTotal = totalBetAmount + leagueEntryFee[0].entry_fee;

    if (newTotal > MONTHLY_BET_LIMIT_GBP) {
      console.log(
        `[DEBUG] Monthly betting limit exceeded for user ${userId}. Current: ${totalBetAmount}, Requested: ${leagueEntryFee[0].entry_fee}, Limit: ${MONTHLY_BET_LIMIT_GBP}`,
      );
      return res.status(403).send({
        error: 'Monthly betting limit exceeded',
        message: `You have reached your monthly betting limit of ${MONTHLY_BET_LIMIT_GBP} GBP. Current month total: ${totalBetAmount} GBP. Your requested bet of ${leagueEntryFee[0].entry_fee} GBP would exceed the limit.`,
      });
    }

    console.log(
      `[DEBUG] User ${userId} monthly bet check passed. Current: ${totalBetAmount}, Requested: ${leagueEntryFee[0].entry_fee}, Limit: ${MONTHLY_BET_LIMIT_GBP}`,
    );

    res.locals.monthlyBetTotal = totalBetAmount;

    next();
  } catch (error: any) {
    console.log(`CHECK MONTHLY BET LIMIT ERROR: ${error.message} 🛑`, error);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while checking betting limits',
    });
  }
};
