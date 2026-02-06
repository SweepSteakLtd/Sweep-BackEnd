import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { fetchState, getAuthToken } from '../../integrations/GBG/GBG';
import { users } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, standardResponses } from '../schemas';

type Decisions =
  | 'Decision: Pass 1+1'
  | 'Decision: Pass 2+2'
  | 'Decision: Manual review'
  | 'Decision: Alert'
  | 'Decision: Pass'
  | 'Decision: Reject';

const mapDecisionsToResult = (decision: Decisions) => {
  switch (decision) {
    case 'Decision: Pass':
    case 'Decision: Pass 1+1':
    case 'Decision: Pass 2+2':
      return 'PASS';
    case 'Decision: Alert':
    case 'Decision: Reject':
      return 'FAIL';
    case 'Decision: Manual review':
      return 'MANUAL';
    default:
      throw new Error(`Unhandled decision ${decision}: gbg verification`);
  }
};

/**
 * Fetch GBG verification state
 * @query instance_id - string - required - The GBG instance ID to check
 * @returns Status object with verification outcome
 */
export const fetchGBGStateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { instance_id } = req.query as { instance_id: string };
    const authToken = await getAuthToken();

    const fetchResult = await fetchState(instance_id, authToken);

    console.log('[GBG_VERIFICATION] Fetch result received:', {
      instance_id,
      status: fetchResult.status,
      hasContext: !!fetchResult.data.context,
    });

    if (!fetchResult.data.context) {
      console.log('[DEBUG]: fetch result is still pending');
      return res.status(200).send({
        status: 'IN_PROGRESS',
      });
    }

    const finalResult = Object.values(fetchResult.data.context.process.flow).filter(
      value => !!value?.result?.outcome?.includes('Decision:'),
    );

    console.log('[GBG_VERIFICATION] Filtered results:', {
      instance_id,
      totalFlowSteps: Object.keys(fetchResult.data.context.process.flow).length,
      filteredResultsCount: finalResult.length,
      outcomes: finalResult.map(r => r.result?.outcome),
    });

    if (
      fetchResult.status === 'Completed' ||
      (fetchResult.status === 'InProgress' &&
        finalResult[0].result.outcome === 'Decision: Manual review')
    ) {
      const outcomeDecision = finalResult[0].result.outcome;
      const verificationStatus = mapDecisionsToResult(outcomeDecision);

      console.log('[GBG_VERIFICATION] Verification status calculation:', {
        instance_id,
        fetchResultStatus: fetchResult.status,
        outcomeDecision,
        calculatedVerificationStatus: verificationStatus,
        willSetKycCompleted: true,
        willSetIdentityVerified: verificationStatus === 'PASS',
        fullResultData: JSON.stringify(finalResult[0], null, 2),
      });

      await database
        .update(users)
        .set({
          kyc_completed: true,
          is_identity_verified: verificationStatus === 'PASS',
          updated_at: new Date(),
        })
        .where(eq(users.kyc_instance_id, instance_id))
        .execute();

      console.log(
        `[DEBUG]: Updated user with instance_id ${instance_id} - kyc_completed: true, is_identity_verified: ${verificationStatus === 'PASS'}`,
      );

      return res.status(200).send({
        status: verificationStatus, //"PASS" | "FAIL" | "MANUAL"
      });
    } else {
      console.log('[GBG_VERIFICATION] Verification still in progress:', {
        instance_id,
        fetchResultStatus: fetchResult.status,
        reason: 'Status not Completed and not Manual review',
      });

      return res.status(200).send({
        status: 'IN_PROGRESS',
      });
    }
  } catch (error: any) {
    console.log(`[DEBUG]: VERIFY CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

fetchGBGStateHandler.apiDescription = {
  summary: 'Fetch GBG verification state',
  description:
    'Retrieves the current state of a GBG identity verification process using the instance ID.',
  operationId: 'fetchGBGState',
  tags: ['users', 'verification'],
  parameters: [
    {
      name: 'instance_id',
      in: 'query',
      required: true,
      description: 'The GBG instance ID for the verification process',
      schema: {
        type: 'string',
      },
      example: 'gbg_instance_abc123',
    },
  ],
  responses: {
    200: {
      description: 'Verification state retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                description: 'The verification outcome or current state',
                enum: ['PASS', 'FAIL', 'MANUAL', 'IN_PROGRESS'],
              },
            },
            required: ['status'],
          },
          examples: {
            completed: {
              summary: 'Verification completed successfully',
              value: {
                status: 'PASS',
              },
            },
            manualReview: {
              summary: 'Manual review required',
              value: {
                status: 'MANUAL',
              },
            },
            inProgress: {
              summary: 'Verification still in progress',
              value: {
                status: 'IN_PROGRESS',
              },
            },
          },
        },
      },
    },
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
