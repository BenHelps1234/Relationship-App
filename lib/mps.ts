export type MpsComponents = {
  physicality: number;
  resources: number;
  reliability: number;
  safety: number;
};

export function clamp01to10(value: number): number {
  return Math.max(0, Math.min(10, Number(value.toFixed(2))));
}

export function bmiScore(weightKg: number | null | undefined, heightCm: number | null | undefined): number {
  if (!weightKg || !heightCm || heightCm <= 0) return 5;
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  const distance = Math.abs(22 - bmi);
  return clamp01to10(10 - distance * 0.7);
}

export function weightedMps(components: MpsComponents): number {
  const result =
    components.physicality * 0.3 +
    components.resources * 0.3 +
    components.reliability * 0.2 +
    components.safety * 0.2;
  return clamp01to10(result);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function scaleBasePotentialToMps(base0to10: number): number {
  const clamped = clamp01to10(base0to10);
  const scaled = 2 + (clamped / 10) * 6;
  return Math.max(2, Math.min(8, Number(scaled.toFixed(2))));
}

export function mpsTier(mps: number): 'Developing' | 'Competitive' | 'Elite' {
  if (mps <= 3) return 'Developing';
  if (mps <= 7) return 'Competitive';
  return 'Elite';
}

export function tierWeight(mps: number): number {
  if (mps <= 3) return 0.5;
  if (mps <= 7) return 1.0;
  return 1.5;
}

export function roadmapActions(components: MpsComponents): Array<{ component: string; current: number; nextAction: string; projectedDelta: number }> {
  return [
    {
      component: 'Physicality',
      current: components.physicality,
      nextAction: 'Upload a recent in-app-captured photo and update weight for BMI guidance.',
      projectedDelta: 0.3
    },
    {
      component: 'Resources',
      current: components.resources,
      nextAction: 'Add self-reported income range now (verification later).',
      projectedDelta: 0.4
    },
    {
      component: 'Reliability',
      current: components.reliability,
      nextAction: 'Complete your profile and respond faster to messages.',
      projectedDelta: 0.4
    },
    {
      component: 'Safety',
      current: components.safety,
      nextAction: 'Complete Blue Tint verification when enabled to gain badge trust.',
      projectedDelta: 0.2
    }
  ];
}

export function likeToImpressionRatio(likesCount: number, impressionsCount: number): number {
  if (impressionsCount <= 0) return 0;
  return likesCount / impressionsCount;
}

export function reliabilityFromImpressions(impressionsCount: number): number {
  return clamp(impressionsCount / 50, 0, 1);
}

export function percentileMps(lir: number, cityLirs: number[]): number {
  if (cityLirs.length === 0) return 5;
  const sorted = [...cityLirs].sort((a, b) => a - b);
  let lessOrEqual = 0;
  for (const v of sorted) {
    if (v <= lir) lessOrEqual += 1;
  }
  const percentile = lessOrEqual / sorted.length;
  return Number((2 + percentile * 6).toFixed(2));
}
