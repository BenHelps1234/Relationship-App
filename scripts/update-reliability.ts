import { prisma } from '@/lib/prisma';
import { weightedMps } from '@/lib/mps';

async function main() {
  const users = await prisma.user.findMany({ include: { profile: true, sentMessages: true } });
  for (const u of users) {
    const completion = (u.profile?.profileCompletion ?? 0) / 10;
    const activityBoost = Math.min(2, u.sentMessages.length / 10);
    const reliability = Math.min(10, completion + activityBoost);
    const mps = weightedMps({
      physicality: u.scorePhysicality,
      resources: u.scoreResources,
      reliability,
      safety: u.scoreSafety
    });
    await prisma.user.update({ where: { id: u.id }, data: { scoreReliability: reliability, mpsCurrent: mps } });
  }
  console.log('Reliability and MPS refreshed.');
}

main().finally(() => prisma.$disconnect());
