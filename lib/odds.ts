function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type MatchChanceInput = {
  viewerMps: number;
  targetMps: number;
  targetIntentScore: number;
  pendingLikesQueue: number;
};

export type MatchChanceResult = {
  percent: number;
  congestionPenaltyApplied: boolean;
  message?: string;
};

export function oddsYouMatch(input: MatchChanceInput): MatchChanceResult {
  const delta = Math.abs(input.viewerMps - input.targetMps);
  let percent = 100 - delta * 15;
  percent += input.targetIntentScore * 10;

  const congestionPenaltyApplied = input.pendingLikesQueue >= 10;
  if (congestionPenaltyApplied) {
    percent *= 0.8;
  }

  percent = clamp(percent, 5, 95);

  return {
    percent: Math.round(percent),
    congestionPenaltyApplied,
    message: congestionPenaltyApplied
      ? 'Even though you are a peer, this person is currently overwhelmed. Your chance to be seen is lower.'
      : undefined
  };
}
