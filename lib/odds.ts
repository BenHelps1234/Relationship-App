import { mpsTier } from './mps';

export function oddsYouMatch(viewerMps: number, targetMps: number, targetDailyLikes: number): { probability: number; warning: boolean } {
  const viewerTier = mpsTier(viewerMps);
  const targetTier = mpsTier(targetMps);
  const tierIndex = { Developing: 1, Competitive: 2, Elite: 3 };
  const gap = tierIndex[targetTier] - tierIndex[viewerTier];
  const base = 0.52 - gap * 0.12 - Math.min(targetDailyLikes, 25) * 0.008;
  const probability = Math.max(0.05, Math.min(0.9, Number(base.toFixed(2))));
  return { probability, warning: gap >= 1 && probability < 0.3 };
}
