import { prisma } from './prisma';

export async function getDemoUser() {
  return prisma.user.findFirst({ include: { profile: true, dailyQuota: true } });
}
