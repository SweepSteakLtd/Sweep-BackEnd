/**
 * GamStop Status Recheck Script (Batch Version)
 *
 * This script runs daily to recheck all users' GamStop self-exclusion status.
 * It uses the GamStop Batch API to efficiently process up to 1,000 users per request.
 *
 * Batch API Details:
 * - Endpoint: https://batch.stage.gamstop.io/v2
 * - Max: 1,000 users per request
 * - Rate Limit: 1 request per second average in a 5-minute period
 * - Request Format: JSON
 * - Request Size: < 256KB
 *
 * Usage:
 *   yarn recheck:gamstop  (runs this script directly)
 *   OR
 *   POST /api/admin/gamstop/recheck  (recommended: uses the API endpoint)
 */

import * as dotenv from 'dotenv';
import { eq, isNotNull } from 'drizzle-orm';
import {
  checkGamstopRegistrationBatch,
  GamstopBatchCheckResult,
  GamstopBatchUserData,
} from '../integrations/Gamstop/gamstop';
import { User, users } from '../models';
import { database, ensureDatabaseReady } from '../services';
dotenv.config();

const BATCH_SIZE = 1000; // Max allowed by GamStop API

async function fetchUsersForGamstopCheck(): Promise<User[]> {
  try {
    console.log('📋 Fetching users with complete GamStop verification data...');


    const usersToCheck = await database
      .select()
      .from(users)
      .where(isNotNull(users.address))
      .execute();


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

    console.log(`✅ Found ${validUsers.length} users with complete data`);
    return validUsers;
  } catch (error: any) {
    console.error('❌ Error fetching users:', error.message);
    throw error;
  }
}


function chunkUsers(users: User[], chunkSize: number): User[][] {
  const chunks: User[][] = [];
  for (let i = 0; i < users.length; i += chunkSize) {
    chunks.push(users.slice(i, i + chunkSize));
  }
  return chunks;
}


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
      `\n📦 Processing batch ${batchNumber}/${totalBatches} (${userBatch.length} users)...`,
    );
    const batchData: GamstopBatchUserData[] = userBatch.map(user => {
      const address = user.address as any;
      return {
        correlationId: user.id, // Use user ID as correlation ID
        first_name: user.first_name,
        last_name: user.last_name,
        date_of_birth: user.date_of_birth,
        email: user.email,
        phone: user.phone_number,
        postcode: address.postcode,
      };
    });


    const results = await checkGamstopRegistrationBatch(batchData);

    console.log(`✅ Received ${results.length} results from GamStop`);

    const resultsMap = new Map<string, GamstopBatchCheckResult>();
    results.forEach(result => {
      if (result.correlationId) {
        resultsMap.set(result.correlationId, result);
      }
    });

    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const user of userBatch) {
      const result = resultsMap.get(user.id);

      if (!result) {
        console.error(`⚠️  No result found for user ${user.email} (ID: ${user.id})`);
        errorCount++;
        continue;
      }

      const previousStatus = user.is_self_excluded || false;
      const newStatus = result.is_registered;

      if (previousStatus !== newStatus) {
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

          console.log(`  ✅ Updated ${user.email}:`);
          console.log(`     Previous: ${previousStatus ? 'Self-excluded' : 'Not excluded'}`);
          console.log(`     New: ${newStatus ? 'Self-excluded' : 'Not excluded'}`);
          console.log(`     MS Request ID: ${result.ms_request_id}`);

          updatedCount++;
        } catch (updateError: any) {
          console.error(`  ❌ Failed to update user ${user.email}:`, updateError.message);
          errorCount++;
        }
      } else {
        console.log(
          `  ℹ️  No change for ${user.email} (${newStatus ? 'excluded' : 'not excluded'})`,
        );
        unchangedCount++;
      }
    }

    return { updatedCount, unchangedCount, errorCount };
  } catch (error: any) {
    console.error(`❌ Error processing batch ${batchNumber}:`, error.message);
    return { updatedCount: 0, unchangedCount: 0, errorCount: userBatch.length };
  }
}

async function main() {
  console.log('🔄 Starting GamStop batch status recheck job...');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    console.log('⏳ Waiting for database connection...');
    await ensureDatabaseReady();
    console.log('✅ Database connection established\n');

    const usersToCheck = await fetchUsersForGamstopCheck();

    if (usersToCheck.length === 0) {
      console.log('ℹ️  No users found for GamStop recheck. Exiting.');
      return;
    }

    const batches = chunkUsers(usersToCheck, BATCH_SIZE);
    console.log(`\n📊 Split ${usersToCheck.length} users into ${batches.length} batches`);
    console.log(`   Batch size: ${BATCH_SIZE} users per batch`);
    console.log(`   Rate limit: 1 request per second average (will wait between batches)\n`);

    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalErrors = 0;

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

      if (i < batches.length - 1) {
        console.log('⏳ Waiting 1 second before next batch (rate limit)...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL SUMMARY:');
    console.log(`  Total users checked: ${usersToCheck.length}`);
    console.log(`  Batches processed: ${batches.length}`);
    console.log(`  Status changed (updated): ${totalUpdated}`);
    console.log(`  Status unchanged: ${totalUnchanged}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log('='.repeat(80));

    if (totalUpdated > 0) {
      console.log(`\n✅ Successfully updated ${totalUpdated} users with changed GamStop status`);
    } else {
      console.log('\n✅ No users with changed GamStop status');
    }

    console.log('\n✅ GamStop batch recheck job completed successfully');
  } catch (error: any) {
    console.error('❌ Fatal error in main execution:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n👋 Script finished, exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
