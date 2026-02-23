import { prisma } from './prisma';

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

type DbLike = typeof prisma;

export async function incrementDailyLikesReceived(profileUserId: string, db: DbLike = prisma) {
  const statDate = todayKey();
  await db.profileDailyStat.upsert({
    where: { profileUserId_statDate: { profileUserId, statDate } },
    update: { likesReceived: { increment: 1 } },
    create: { profileUserId, statDate, likesReceived: 1 }
  });
}
