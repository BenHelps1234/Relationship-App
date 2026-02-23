import { prisma } from '@/lib/prisma';

async function main() {
  await prisma.dailyQuota.updateMany({
    data: { likesRemaining: 5, profilesShownToday: 0, peerReviewsCompleted: 0, resetAt: new Date() }
  });
  console.log('Daily quotas reset.');
}

main().finally(() => prisma.$disconnect());
