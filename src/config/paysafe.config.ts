interface PaysafeConfig {
  apiKeyUsername: string;
  apiKeyPassword: string;
  accountNumber: string;
  environment: 'TEST' | 'LIVE';
  apiBaseUrl: string;
  webhookSecret: string;
}
//OT-995080:B-qa2-0-6329adf3-0-302c021403f98c11785c2c0082e37845eb32152b167af77e021434a76daa311a8813266d9bf503c9699c474e0fd9
export const paysafeConfig: PaysafeConfig = {
  apiKeyUsername: process.env.PAYSAFE_API_KEY_USERNAME || 'OT-1139430',
  apiKeyPassword: process.env.PAYSAFE_API_KEY_PASSWORD || 'B-qa2-0-6966bd47-1-302c02142d47988b9d47889c66ba950c49a23afda4616536021437710dada462a650a7f4a6d2ae8a90390c6e31ca',

  // apiKeyUsername: process.env.PAYSAFE_API_KEY_USERNAME || 'OT-995080',
  // apiKeyPassword: process.env.PAYSAFE_API_KEY_PASSWORD || 'B-qa2-0-6329adf3-0-302c021403f98c11785c2c0082e37845eb32152b167af77e021434a76daa311a8813266d9bf503c9699c474e0fd9',

  accountNumber: process.env.PAYSAFE_ACCOUNT_NUMBER || '',
  environment: (process.env.PAYSAFE_ENVIRONMENT || 'TEST') as 'TEST' | 'LIVE',
  apiBaseUrl: process.env.PAYSAFE_API_BASE_URL || 'https://api.test.paysafe.com',
  webhookSecret: process.env.PAYSAFE_WEBHOOK_SECRET || '',
};
