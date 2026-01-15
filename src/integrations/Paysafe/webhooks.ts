import crypto from 'crypto';
import { paysafeConfig } from '../../config/paysafe.config';

/**
 * Verify Paysafe webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const hmac = crypto.createHmac('sha256', paysafeConfig.webhookSecret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
