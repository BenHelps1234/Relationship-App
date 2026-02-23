import { prisma } from './prisma';
export const WAITLIST_DAILY_REVIEW_CAP = 20;

export async function ensureWaitlistState(userId: string, cityId: string) {
  return prisma.waitlistState.upsert({
    where: { userId },
    update: { cityId },
    create: { userId, cityId }
  });
}

export async function waitlistReviewsTodayCount(userId: string): Promise<number> {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.peerReview.count({
    where: {
      raterUserId: userId,
      createdAt: { gte: start, lt: end }
    }
  });
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
