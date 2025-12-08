/**
 * Maps DataGolf country codes to ISO 3166-1 alpha-2 country codes
 * used by HTML flag libraries
 */

const DATAGOLF_TO_ISO_MAP: Record<string, string> = {
  // United Kingdom constituent countries - map to GB
  ENG: 'GB', // England
  SCO: 'GB', // Scotland
  WAL: 'GB', // Wales
  NIR: 'GB', // Northern Ireland
  GBR: 'GB', // Great Britain

  // Non-standard 3-letter codes
  CHI: 'CL', // Chile
  SUI: 'CH', // Switzerland
  GER: 'DE', // Germany
  NED: 'NL', // Netherlands
  DEN: 'DK', // Denmark
  SIN: 'SG', // Singapore
  TPE: 'TW', // Chinese Taipei (Taiwan)
  MAW: 'MW', // Malawi
  PUR: 'PR', // Puerto Rico
  PHI: 'PH', // Philippines
  PAR: 'PY', // Paraguay
  MAS: 'MY', // Malaysia
  CRC: 'CR', // Costa Rica
  BAH: 'BS', // Bahamas
  CAY: 'KY', // Cayman Islands
  BAN: 'BD', // Bangladesh
  TAN: 'TZ', // Tanzania
  GRE: 'GR', // Greece
  MRI: 'MU', // Mauritius
  NGR: 'NG', // Nigeria
  SRI: 'LK', // Sri Lanka
  FIJ: 'FJ', // Fiji
  GUA: 'GT', // Guatemala
  URU: 'UY', // Uruguay
  DOM: 'DO', // Dominican Republic
  VEN: 'VE', // Venezuela

  // Standard 3-letter codes that match ISO alpha-3
  USA: 'US',
  SWE: 'SE',
  EGY: 'EG',
  POR: 'PT',
  TUR: 'TR',
  RSA: 'ZA',
  COL: 'CO',
  ESP: 'ES',
  IND: 'IN',
  FIN: 'FI',
  UGA: 'UG',
  JPN: 'JP',
  QAT: 'QA',
  KSA: 'SA',
  UAE: 'AE',
  OMA: 'OM',
  BRN: 'BH',
  NZL: 'NZ',
  AUS: 'AU',
  FRA: 'FR',
  ZIM: 'ZW',
  KOR: 'KR',
  MEX: 'MX',
  CAN: 'CA',
  RUS: 'RU',
  THA: 'TH',
  ARG: 'AR',
  AUT: 'AT',
  KEN: 'KE',
  SVK: 'SK',
  CZE: 'CZ',
  CHN: 'CN',
  PER: 'PE',
  TUN: 'TN',
  BRA: 'BR',
  ARM: 'AM',
  BEL: 'BE',
  ITA: 'IT',
  NOR: 'NO',
  BER: 'BM',
  ISL: 'IS',
  IRL: 'IE',
  MAR: 'MA',
  AND: 'AD',
  IMN: 'IM',
  POL: 'PL',
  UKR: 'UA',
  ECU: 'EC',
  ZAM: 'ZM',
  SWZ: 'SZ',
  MNE: 'ME',
  PAK: 'PK',
  EST: 'EE',
  ALB: 'AL',
  HKG: 'HK',
  PAN: 'PA',
};

/**
 * Converts a DataGolf country code to ISO 3166-1 alpha-2 format
 * @param dataGolfCode - The country code from DataGolf API
 * @returns ISO 3166-1 alpha-2 country code (2 letters)
 */
export function mapDataGolfCountryCode(dataGolfCode: string): string {
  const upperCode = dataGolfCode.trim().toUpperCase();

  // Check if we have a mapping
  const isoCode = DATAGOLF_TO_ISO_MAP[upperCode];

  if (isoCode) {
    return isoCode;
  }

  // If it's already 2 letters, assume it's already ISO format
  if (upperCode.length === 2) {
    return upperCode;
  }

  // Log warning for unmapped codes
  console.warn(`⚠️  Unmapped country code: ${dataGolfCode}`);

  // Return original code as fallback
  return upperCode;
}

/**
 * Checks if a country code is valid ISO 3166-1 alpha-2 format
 * @param code - The country code to validate
 * @returns true if the code is 2 uppercase letters
 */
export function isValidISOCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}
