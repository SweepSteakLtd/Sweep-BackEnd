import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { auditLogs, NewAuditLog } from '../models';
import { database } from './cloudsql';

export type AuditAction =
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'CREATE_BET'
  | 'DELETE_BET'
  | 'CREATE_TEAM'
  | 'UPDATE_TEAM'
  | 'DELETE_TEAM'
  | 'CREATE_LEAGUE'
  | 'UPDATE_LEAGUE'
  | 'DELETE_LEAGUE'
  | 'CREATE_TRANSACTION'
  | 'UPDATE_TRANSACTION'
  | 'DELETE_TRANSACTION'
  | 'SELF_EXCLUDE'
  | 'UPDATE_DEPOSIT_LIMIT'
  | 'UPDATE_BET_LIMIT'
  | 'KYC_COMPLETED'
  | 'GAMSTOP_CHECK'
  | 'GBG_CHECK'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_COMPLETED_WEBHOOK'
  | 'PAYMENT_FAILED_WEBHOOK'
  | 'WITHDRAWAL_INITIATED'
  | 'WITHDRAWAL_COMPLETED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED';

export type EntityType =
  | 'user'
  | 'bet'
  | 'team'
  | 'league'
  | 'transaction'
  | 'player'
  | 'tournament'
  | 'auth';

interface AuditLogParams {
  userId?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Create an audit log entry
 * This function should be called whenever a significant state change occurs
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress = params.req?.ip || params.req?.socket?.remoteAddress;
    const userAgent = params.req?.get('user-agent');

    const auditLog = {
      id: createId(),
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_values: params.oldValues || {},
      new_values: params.newValues || {},
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      metadata: params.metadata || {},
    };

    await database.insert(auditLogs).values(auditLog).execute();
  } catch (error) {
    // Never throw errors from audit logging - just log them
    console.error('❌ Failed to create audit log:', error);
  }
}

/**
 * Helper function to extract changed fields between old and new objects
 */
export function extractChangedFields<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: Partial<T>,
): { oldValues: Partial<T>; newValues: Partial<T> } {
  const oldValues: Partial<T> = {};
  const newValues: Partial<T> = {};

  for (const key in newObj) {
    if (newObj[key] !== oldObj[key]) {
      oldValues[key] = oldObj[key];
      newValues[key] = newObj[key];
    }
  }

  return { oldValues, newValues };
}

/**
 * Middleware to automatically log actions
 * Usage: Apply to routes that modify data
 */
export function auditLogMiddleware(action: AuditAction, entityType: EntityType) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store audit info in res.locals for use in handler
    res.locals.auditAction = action;
    res.locals.auditEntityType = entityType;
    next();
  };
}
