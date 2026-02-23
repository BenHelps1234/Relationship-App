import { prisma } from './prisma';
import { todayKey } from './daily-stats';

export function isBeforeTodayLocal(date: Date, now = new Date()): boolean {
  return todayKey(date) < todayKey(now);
}

export async function ensureDailyQuotaFresh(userId: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.dailyQuota.findUnique({ where: { userId } });

  if (!existing) {
    await prisma.dailyQuota.create({
      data: {
        userId,
        likesRemaining: 5,
        profilesShownToday: 0,
        shownUserIdsJson: '[]',
        peerReviewsCompleted: 0,
        resetAt: now
      }
    });
    return;
  }

  if (isBeforeTodayLocal(existing.resetAt, now)) {
    await prisma.dailyQuota.update({
      where: { userId },
      data: {
        likesRemaining: 5,
        profilesShownToday: 0,
        shownUserIdsJson: '[]',
        peerReviewsCompleted: 0,
        resetAt: now
      }
    });
  }
}

