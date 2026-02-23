import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type DbLike = PrismaClient | Prisma.TransactionClient;

export async function incrementDailyLikesReceived(profileUserId: string, db: DbLike = prisma) {
  const statDate = todayKey();
  await db.profileDailyStat.upsert({
    where: { profileUserId_statDate: { profileUserId, statDate } },
    update: { likesReceived: { increment: 1 } },
    create: { profileUserId, statDate, likesReceived: 1 }
  });
}
