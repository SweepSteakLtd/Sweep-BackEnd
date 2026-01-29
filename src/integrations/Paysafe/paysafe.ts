import { paysafeConfig } from '../../config/paysafe.config';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';
import { PaysafePaymentRequest, PaysafePaymentResponse, PaysafeWithdrawalRequest } from './types';

class PaysafeClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    const auth = Buffer.from(paysafeConfig.backendApiKey).toString('base64');

    this.baseUrl = paysafeConfig.apiBaseUrl;
    this.headers = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Process a payment using a payment handle token
   */
  async processPayment(paymentRequest: PaysafePaymentRequest): Promise<PaysafePaymentResponse> {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/paymenthub/v1/payments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          merchantRefNum: paymentRequest.merchantRefNum,
          amount: paymentRequest.amount,
          currencyCode: paymentRequest.currencyCode,
          paymentHandleToken: paymentRequest.paymentHandleToken,
          merchantDescriptor: {
            dynamicDescriptor: 'ChipIn betting',
          },
          billingDetails: paymentRequest.billingDetails,
        }),
        timeout: 30000,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Paysafe API request failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      return (await response.json()) as PaysafePaymentResponse;
    } catch (error: any) {
      throw new Error(`Paysafe API Error: ${error.message}`);
    }
  }

  /**
   * Process a withdrawal using original credits endpoint (for iGaming)
   */
  async processWithdrawal(
    withdrawalRequest: PaysafeWithdrawalRequest,
  ): Promise<PaysafePaymentResponse> {
    try {
      const requestBody: any = {
        merchantRefNum: withdrawalRequest.merchantRefNum,
        amount: withdrawalRequest.amount,
        currencyCode: withdrawalRequest.currencyCode,
        paymentHandleToken: withdrawalRequest.paymentHandleToken,
        description: withdrawalRequest.description,
        dupCheck: true,
      };

      // Add optional billingDetails if provided
      if (withdrawalRequest.billingDetails) {
        requestBody.billingDetails = withdrawalRequest.billingDetails;
      }

      const response = await fetchWithTimeout(`${this.baseUrl}/paymenthub/v1/originalcredits`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
        timeout: 30000,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Paysafe Original Credit API request failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      return (await response.json()) as PaysafePaymentResponse;
    } catch (error: any) {
      throw new Error(`Paysafe Original Credit API Error: ${error.message}`);
    }
  }

  /**
   * Get payment status by transaction ID
   */
  async getPaymentStatus(transactionId: string): Promise<PaysafePaymentResponse> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/paymenthub/v1/payments/${transactionId}`,
        {
          method: 'GET',
          headers: this.headers,
          timeout: 30000,
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Failed to get payment status: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      return (await response.json()) as PaysafePaymentResponse;
    } catch (error: any) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(transactionId: string, amount: number, merchantRefNum: string): Promise<any> {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/paymenthub/v1/refunds`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          paymentId: transactionId,
          amount,
          merchantRefNum,
        }),
        timeout: 30000,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Failed to refund payment: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }
}

export const paysafeClient = new PaysafeClient();
