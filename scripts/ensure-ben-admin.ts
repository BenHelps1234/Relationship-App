import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

async function main() {
  let city = await prisma.city.findUnique({ where: { zipPrefix: '100' } });
  if (!city) {
    city = await prisma.city.create({ data: { name: 'New York', zipPrefix: '100' } });
  }

  const passwordHash = await bcrypt.hash('Ben69', 10);

  const ben = await prisma.user.upsert({
    where: { email: 'Ben' },
    update: {
      passwordHash,
      accountStatus: 'ADMIN' as any,
      isAdmin: true,
      lastActiveAt: new Date(),
      cityId: city.id,
      basePotentialScore: 5,
      basePotential: 5,
      reliability: 1,
      reliabilityScore: 1,
      impressionsCount: 0,
      impressions_count: 0,
      likesCount: 0,
      likes_received_count: 0,
      likesReceivedCount: 0,
      mps: 5,
      mpsCurrent: 5
    },
    create: {
      email: 'Ben',
      passwordHash,
      gender: 'male',
      age: 30,
      zip: '10001',
      cityId: city.id,
      accountStatus: 'ADMIN' as any,
      isAdmin: true,
      lastActiveAt: new Date(),
      mps: 5,
      mpsCurrent: 5,
      basePotential: 5,
      basePotentialScore: 5,
      scorePhysicality: 5,
      scoreResources: 5,
      scoreReliability: 5,
      reliability: 1,
      reliabilityScore: 1,
      impressionsCount: 0,
      impressions_count: 0,
      likesCount: 0,
      likes_received_count: 0,
      likesReceivedCount: 0,
      scoreSafety: 5
    }
  });

  await prisma.dailyQuota.upsert({
    where: { userId: ben.id },
    update: {},
    create: { userId: ben.id, likesRemaining: 5, profilesShownToday: 0, shownUserIdsJson: '[]', peerReviewsCompleted: 0, resetAt: new Date() }
  });

  await prisma.profile.upsert({
    where: { userId: ben.id },
    update: { preloadedContact: 'admin@local' },
    create: {
      userId: ben.id,
      bio: 'Admin account',
      photoMainUrl: 'https://picsum.photos/seed/admin-ben/400/400',
      photoCapturedAt: new Date(),
      incomeSelfReported: 0,
      heightCm: 180,
      weightKg: 80,
      profileCompletion: 100,
      verificationStatus: 'passed',
      preloadedContact: 'admin@local'
    }
  });

  await prisma.waitlistState.upsert({
    where: { userId: ben.id },
    update: { cityId: city.id },
    create: { userId: ben.id, cityId: city.id }
  });

  console.log('Ben admin ensured.');
}

main().finally(() => prisma.$disconnect());
