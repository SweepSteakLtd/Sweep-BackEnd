export interface PaysafePaymentRequest {
  merchantRefNum: string;
  amount: number; // In minor units (cents)
  currencyCode: string;
  paymentHandleToken: string;
  description?: string;
  billingDetails?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
}

export interface PaysafeWithdrawalRequest {
  merchantRefNum: string;
  amount: number; // In minor units (cents)
  currencyCode: string;
  paymentHandleToken: string;
  description: string; // Description of the transaction
  billingDetails?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
}

export interface PaysafePaymentResponse {
  id: string; // Paysafe transaction ID
  merchantRefNum: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  currencyCode: string;
  gatewayResponse?: {
    code?: string;
    message?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface PaysafeWebhookPayload {
  eventType: string;
  eventId: string;
  eventTime: string;
  objectType: string;
  object: {
    id: string;
    merchantRefNum: string;
    status: string;
    amount: number;
  };
}
