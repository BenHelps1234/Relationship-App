import { prisma } from '@/lib/prisma';

export async function runDailyReset() {
  await prisma.dailyQuota.updateMany({
    data: { likesRemaining: 5, profilesShownToday: 0, shownUserIdsJson: '[]', peerReviewsCompleted: 0, resetAt: new Date() }
  });
}

async function main() {
  await runDailyReset();
  console.log('Daily quotas reset.');
}

if (require.main === module) {
  main().finally(() => prisma.$disconnect());
}
