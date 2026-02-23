import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { weightedMps } from '@/lib/mps';
import { refreshCityStatus } from '@/lib/city';

async function main() {
  await prisma.profileDailyStat.deleteMany();
  await prisma.peerReview.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.like.deleteMany();
  await prisma.mpsHistory.deleteMany();
  await prisma.dailyQuota.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cityStatus.deleteMany();
  await prisma.city.deleteMany();

  const nyc = await prisma.city.create({ data: { name: 'New York', zipPrefix: '100' } });
  const sf = await prisma.city.create({ data: { name: 'San Francisco', zipPrefix: '941' } });

  const pass = await bcrypt.hash('password123', 10);
  for (let i = 1; i <= 30; i++) {
    const cityId = i < 20 ? nyc.id : sf.id;
    const gender = i % 2 === 0 ? 'female' : 'male';
    const physicality = 4 + (i % 6);
    const resources = 3 + (i % 5);
    const reliability = 3 + (i % 4);
    const safety = i % 3 === 0 ? 8 : 4;
    const mps = weightedMps({ physicality, resources, reliability, safety });
    const user = await prisma.user.create({
      data: {
        email: `user${i}@demo.local`,
        passwordHash: pass,
        gender,
        zip: cityId === nyc.id ? '10001' : '94105',
        cityId,
        lastActiveAt: i <= 24 ? new Date() : new Date(Date.now() - 40 * 24 * 3600 * 1000),
        mpsCurrent: mps,
        scorePhysicality: physicality,
        scoreResources: resources,
        scoreReliability: reliability,
        scoreSafety: safety,
        dailyQuota: { create: { likesRemaining: 5, profilesShownToday: 0, shownUserIdsJson: '[]', peerReviewsCompleted: 2, resetAt: new Date() } },
        profile: {
          create: {
            bio: 'MVP profile',
            photoMainUrl: `https://picsum.photos/seed/${i}/400/400`,
            photoCapturedAt: new Date(),
            incomeSelfReported: 50000 + i * 1000,
            heightCm: 165 + (i % 20),
            weightKg: 55 + (i % 30),
            profileCompletion: 75,
            verificationStatus: i % 5 === 0 ? 'passed' : 'unverified'
          }
        },
        mpsHistory: { create: { mpsValue: mps, componentSnapshot: JSON.stringify({ physicality, resources, reliability, safety }) } }
      }
    });

    await prisma.profileDailyStat.create({
      data: {
        profileUserId: user.id,
        statDate: new Date().toISOString().slice(0, 10),
        likesReceived: i % 12
      }
    });
  }

  await refreshCityStatus();

  console.log('Seed complete. Login with a seeded account once session support is configured.');
}

main().finally(() => prisma.$disconnect());
