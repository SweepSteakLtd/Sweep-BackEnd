import { eq, isNotNull } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import {
  checkGamstopRegistrationBatch,
  GamstopBatchCheckResult,
  GamstopBatchUserData,
} from '../../../integrations/Gamstop/gamstop';
import { User, users } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, standardResponses } from '../../schemas';

const BATCH_SIZE = 1000; // Max allowed by GamStop API

interface RecheckStats {
  totalUsers: number;
  batchesProcessed: number;
  statusChanged: number;
  statusUnchanged: number;
  errors: number;
  duration: number;
}

/**
 * Fetch all users who have complete data required for GamStop verification
 */
async function fetchUsersForGamstopCheck(): Promise<User[]> {
  const usersToCheck = await database
    .select()
    .from(users)
    .where(isNotNull(users.address))
    .execute();

  // Filter out users who don't have complete data
  const validUsers = usersToCheck.filter((user: User) => {
    const address = user.address as any;
    return (
      user.first_name &&
      user.last_name &&
      user.email &&
      user.phone_number &&
      user.address &&
      address?.postcode
    );
  });

  return validUsers;
}

/**
 * Split users into batches of specified size
 */
function chunkUsers(users: User[], chunkSize: number): User[][] {
  const chunks: User[][] = [];
  for (let i = 0; i < users.length; i += chunkSize) {
    chunks.push(users.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process a batch of users and check their GamStop status
 */
async function processBatch(
  userBatch: User[],
  batchNumber: number,
  totalBatches: number,
): Promise<{
  updatedCount: number;
  unchangedCount: number;
  errorCount: number;
}> {
  try {
    console.log(
      `[GamStop Recheck] Processing batch ${batchNumber}/${totalBatches} (${userBatch.length} users)...`,
    );

    // Prepare batch data with correlation IDs
    const batchData: GamstopBatchUserData[] = userBatch.map(user => {
      const address = user.address as any;
      return {
        correlationId: user.id, // Use user ID as correlation ID
        first_name: user.first_name,
        last_name: user.last_name,
        date_of_birth: user.date_of_birth || '1990-01-01',
        email: user.email,
        phone: user.phone_number,
        postcode: address.postcode,
      };
    });

    // Make batch request to GamStop
    const results = await checkGamstopRegistrationBatch(batchData);

    console.log(`[GamStop Recheck] Received ${results.length} results from GamStop`);

    // Create a map of results by correlation ID
    const resultsMap = new Map<string, GamstopBatchCheckResult>();
    results.forEach(result => {
      if (result.correlationId) {
        resultsMap.set(result.correlationId, result);
      }
    });

    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    // Process each user in the batch
    for (const user of userBatch) {
      const result = resultsMap.get(user.id);

      if (!result) {
        console.error(`[GamStop Recheck] No result found for user ${user.email} (ID: ${user.id})`);
        errorCount++;
        continue;
      }

      const previousStatus = user.is_self_excluded || false;
      const newStatus = result.is_registered;

      if (previousStatus !== newStatus) {
        // Status changed - update database
        try {
          await database
            .update(users)
            .set({
              is_self_excluded: newStatus,
              game_stop_id: result.ms_request_id,
              updated_at: new Date(),
            })
            .where(eq(users.id, user.id))
            .execute();

          console.log(`[GamStop Recheck] Updated ${user.email}:`);
          console.log(
            `  Previous: ${previousStatus ? 'Self-excluded' : 'Not excluded'}`,
          );
          console.log(`  New: ${newStatus ? 'Self-excluded' : 'Not excluded'}`);
          console.log(`  MS Request ID: ${result.ms_request_id}`);

          updatedCount++;
        } catch (updateError: any) {
          console.error(
            `[GamStop Recheck] Failed to update user ${user.email}:`,
            updateError.message,
          );
          errorCount++;
        }
      } else {
        unchangedCount++;
      }
    }

    return { updatedCount, unchangedCount, errorCount };
  } catch (error: any) {
    console.error(`[GamStop Recheck] Error processing batch ${batchNumber}:`, error.message);
    return { updatedCount: 0, unchangedCount: 0, errorCount: userBatch.length };
  }
}

/**
 * Admin endpoint to recheck GamStop status for all users
 * This triggers a batch recheck of all users' self-exclusion status
 * @returns Summary statistics of the recheck operation
 */
export const recheckGamstopStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();

  try {
    console.log('[GamStop Recheck] Starting batch recheck job...');
    console.log(`[GamStop Recheck] Timestamp: ${new Date().toISOString()}`);

    // Fetch all users who can be checked
    const usersToCheck = await fetchUsersForGamstopCheck();

    if (usersToCheck.length === 0) {
      console.log('[GamStop Recheck] No users found for recheck.');
      return res.status(200).json({
        success: true,
        message: 'No users found for GamStop recheck',
        stats: {
          totalUsers: 0,
          batchesProcessed: 0,
          statusChanged: 0,
          statusUnchanged: 0,
          errors: 0,
          duration: Date.now() - startTime,
        },
      });
    }

    // Split users into batches
    const batches = chunkUsers(usersToCheck, BATCH_SIZE);
    console.log(
      `[GamStop Recheck] Split ${usersToCheck.length} users into ${batches.length} batches`,
    );

    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalErrors = 0;

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const { updatedCount, unchangedCount, errorCount } = await processBatch(
        batch,
        i + 1,
        batches.length,
      );

      totalUpdated += updatedCount;
      totalUnchanged += unchangedCount;
      totalErrors += errorCount;

      // Rate limiting: Wait 1 second between batches (except for the last one)
      if (i < batches.length - 1) {
        console.log('[GamStop Recheck] Waiting 1 second before next batch (rate limit)...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const duration = Date.now() - startTime;

    const stats: RecheckStats = {
      totalUsers: usersToCheck.length,
      batchesProcessed: batches.length,
      statusChanged: totalUpdated,
      statusUnchanged: totalUnchanged,
      errors: totalErrors,
      duration,
    };

    console.log('[GamStop Recheck] === FINAL SUMMARY ===');
    console.log(`[GamStop Recheck] Total users checked: ${stats.totalUsers}`);
    console.log(`[GamStop Recheck] Batches processed: ${stats.batchesProcessed}`);
    console.log(`[GamStop Recheck] Status changed: ${stats.statusChanged}`);
    console.log(`[GamStop Recheck] Status unchanged: ${stats.statusUnchanged}`);
    console.log(`[GamStop Recheck] Errors: ${stats.errors}`);
    console.log(`[GamStop Recheck] Duration: ${duration}ms`);
    console.log('[GamStop Recheck] Job completed successfully');

    return res.status(200).json({
      success: true,
      message: 'GamStop status recheck completed',
      stats,
    });
  } catch (error: any) {
    console.error('[GamStop Recheck] Fatal error:', error.message);
    console.error(error.stack);

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to complete GamStop recheck',
      details: error.message,
    });
  }
};

recheckGamstopStatusHandler.apiDescription = {
  summary: 'Recheck GamStop status for all users (Admin)',
  description:
    'Triggers a batch recheck of GamStop self-exclusion status for all users with complete verification data. Uses the GamStop Batch API to efficiently process up to 1,000 users per request. Returns detailed statistics about the operation.',
  operationId: 'adminRecheckGamstopStatus',
  tags: ['admin', 'gamstop'],
  responses: {
    200: {
      description: 'Recheck completed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'GamStop status recheck completed' },
              stats: {
                type: 'object',
                properties: {
                  totalUsers: { type: 'number', example: 1250 },
                  batchesProcessed: { type: 'number', example: 2 },
                  statusChanged: { type: 'number', example: 15 },
                  statusUnchanged: { type: 'number', example: 1230 },
                  errors: { type: 'number', example: 5 },
                  duration: { type: 'number', example: 2500, description: 'Duration in milliseconds' },
                },
              },
            },
          },
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
