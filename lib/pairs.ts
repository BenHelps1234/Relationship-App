export function pairKey(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join('__');
}

