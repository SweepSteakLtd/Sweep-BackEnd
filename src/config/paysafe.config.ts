interface PaysafeConfig {
  apiKeyUsername: string;
  apiKeyPassword: string;
  backendApiKey: string;
  accountNumber: string;
  environment: 'TEST' | 'LIVE';
  apiBaseUrl: string;
  webhookSecret: string;
}
export const paysafeConfig: PaysafeConfig = {
  apiKeyUsername: process.env.PAYSAFE_API_KEY_USERNAME || '',
  apiKeyPassword: process.env.PAYSAFE_API_KEY_PASSWORD || '',
  backendApiKey: process.env.PAYSAFE_KEY || '',

  accountNumber: process.env.PAYSAFE_ACCOUNT_NUMBER || '',
  environment: (process.env.PAYSAFE_ENVIRONMENT || 'TEST') as 'TEST' | 'LIVE',
  apiBaseUrl: process.env.PAYSAFE_API_BASE_URL || 'https://api.test.paysafe.com',
  webhookSecret: process.env.PAYSAFE_WEBHOOK_SECRET || '',
};
