import { calculateMarketScore } from './marketScore';
export { likeImpressionRatio, refreshMarketScores, reliabilityFromImpressions } from './marketScore';

export async function calculateCityMps(userId: string): Promise<number | null> {
  const result = await calculateMarketScore(userId);
  if (!result || result.status === 'calibrating') return null;
  return result.mps;
}

export function displayMpsOrCalibrating(mps: number, impressions: number): string {
  return impressions < 20 ? 'Calibrating...' : mps.toFixed(2);
}
