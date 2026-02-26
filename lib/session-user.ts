import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { ensureDailyQuotaFresh } from './quota';

export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireSessionUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

export async function getSessionUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  await ensureDailyQuotaFresh(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, dailyQuota: true }
  });
  if (!user || user.accountStatus === 'banned') return null;
  return user;
}
