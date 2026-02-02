/**
 * Utility functions for pot size and prize distribution calculations
 */

/**
 * Platform fee percentage (10%)
 */
export const PLATFORM_FEE_PERCENTAGE = 0.1;

/**
 * Net payout percentage after platform fee (90%)
 */
export const NET_PAYOUT_MULTIPLIER = 1 - PLATFORM_FEE_PERCENTAGE;

/**
 * Default prize distribution percentages for positions 1-5
 */
export const DEFAULT_PRIZE_DISTRIBUTION = [
  { position: 1, percentage: 0.6 }, // 60%
  { position: 2, percentage: 0.15 }, // 15%
  { position: 3, percentage: 0.125 }, // 12.5%
  { position: 4, percentage: 0.075 }, // 7.5%
  { position: 5, percentage: 0.05 }, // 5%
] as const;

/**
 * Prize distribution entry
 */
export interface PrizeDistribution {
  position: number;
  percentage: number;
  amount: number;
}

/**
 * Reward split data structure
 */
export interface RewardSplitData {
  position: number;
  percentage: number;
  type: string;
  product_id: string;
}

/**
 * Calculates the total pot size after platform fee
 * @param entryFee - The entry fee per team
 * @param teamCount - Number of teams in the league
 * @returns Total pot after deducting platform fee (90% of total entry fees)
 */
export const calculateTotalPot = (entryFee: number, teamCount: number): number => {
  return entryFee * teamCount * NET_PAYOUT_MULTIPLIER;
};

/**
 * Calculates the platform fee amount
 * @param entryFee - The entry fee per team
 * @param teamCount - Number of teams in the league
 * @returns Platform fee amount (10% of total entry fees)
 */
export const calculatePlatformFee = (entryFee: number, teamCount: number): number => {
  return entryFee * teamCount * PLATFORM_FEE_PERCENTAGE;
};

/**
 * Calculates the total staked amount (after platform fee)
 * This is the same as total pot - represents the net amount available
 * @param entryFee - The entry fee per team
 * @param teamCount - Number of teams in the league
 * @returns Total staked amount after platform fee (90% of entry fees)
 */
export const calculateTotalStaked = (entryFee: number, teamCount: number): number => {
  return calculateTotalPot(entryFee, teamCount);
};

/**
 * Generates prize distribution with calculated amounts
 * @param totalPot - The total pot to distribute
 * @param distributionPercentages - Array of position/percentage pairs (defaults to DEFAULT_PRIZE_DISTRIBUTION)
 * @returns Array of prize distribution with calculated amounts
 */
export const calculatePrizeDistribution = (
  totalPot: number,
  distributionPercentages: ReadonlyArray<{
    position: number;
    percentage: number;
  }> = DEFAULT_PRIZE_DISTRIBUTION,
): PrizeDistribution[] => {
  return distributionPercentages.map(dist => ({
    position: dist.position,
    percentage: dist.percentage,
    amount: totalPot * dist.percentage,
  }));
};

/**
 * Calculates individual reward amount for a specific position
 * Uses Math.floor to avoid floating-point precision issues
 * @param totalPot - The total pot
 * @param percentage - The percentage for this position (0-1)
 * @returns Floored reward amount
 */
export const calculateRewardAmount = (totalPot: number, percentage: number): number => {
  return Math.floor(totalPot * percentage);
};

/**
 * Validates that reward percentages don't exceed 100%
 * @param rewards - Array of rewards with percentage field
 * @returns Object with isValid flag and totalPercentage
 */
export const validateRewardPercentages = (
  rewards: Array<{ percentage: number }>,
): { isValid: boolean; totalPercentage: number } => {
  const totalPercentage = rewards.reduce((sum, r) => sum + r.percentage, 0);
  return {
    isValid: totalPercentage <= 1.0,
    totalPercentage,
  };
};

/**
 * Gets the reward structure, using default if custom rewards not provided
 * @param customRewards - Custom reward structure (optional)
 * @returns Reward structure to use
 */
export const getRewardStructure = <T extends { position: number; percentage: number }>(
  customRewards?: T[] | null,
): T[] | typeof DEFAULT_PRIZE_DISTRIBUTION => {
  if (customRewards && customRewards.length > 0) {
    return customRewards;
  }
  return DEFAULT_PRIZE_DISTRIBUTION;
};
