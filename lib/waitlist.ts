import { prisma } from './prisma';

export const WAITLIST_JUMP_REVIEWS_REQUIRED = 2;
export const WAITLIST_JUMP_COOLDOWN_HOURS = 24;

export async function ensureWaitlistState(userId: string, cityId: string) {
  return prisma.waitlistState.upsert({
    where: { userId },
    update: { cityId },
    create: { userId, cityId }
  });
}

export function isEligibleForWaitlistJump(nextEligibleAt: Date | null | undefined, now = new Date()): boolean {
  return !nextEligibleAt || nextEligibleAt <= now;
}

export function waitlistNextEligible(now = new Date()): Date {
  return new Date(now.getTime() + WAITLIST_JUMP_COOLDOWN_HOURS * 3600 * 1000);
}

export async function waitlistRank(cityId: string, userId: string): Promise<number> {
  const mine = await prisma.waitlistState.findUnique({ where: { userId } });
  if (!mine) return 1;

  const ahead = await prisma.waitlistState.count({
    where: {
      cityId,
      OR: [
        { priorityScore: { gt: mine.priorityScore } },
        {
          priorityScore: mine.priorityScore,
          priorityUpdatedAt: { lt: mine.priorityUpdatedAt },
          userId: { not: userId }
        }
      ]
    }
  });

  return ahead + 1;
}

