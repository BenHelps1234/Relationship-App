export function defaultAgeRange(userAge: number): { min: number; max: number } {
  const min = Math.max(18, Math.trunc(userAge) - 10);
  const max = Math.trunc(userAge) + 10;
  return { min, max };
}

export function effectiveAgeRange(userAge: number, preferredAgeMin: number | null, preferredAgeMax: number | null): { min: number; max: number } {
  const defaults = defaultAgeRange(userAge);
  const min = preferredAgeMin ?? defaults.min;
  const max = preferredAgeMax ?? defaults.max;
  return { min: Math.max(18, Math.trunc(min)), max: Math.trunc(max) };
}

