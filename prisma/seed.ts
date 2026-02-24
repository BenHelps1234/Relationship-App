import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { scaleBasePotentialToMps, weightedMps } from '@/lib/mps';
import { refreshCityStatus } from '@/lib/city';
import { todayKey } from '@/lib/daily-stats';
import { pairKey } from '@/lib/pairs';

async function main() {
  await prisma.profileDailyStat.deleteMany();
  await prisma.peerReview.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.like.deleteMany();
  await prisma.mpsHistory.deleteMany();
  await prisma.dailyQuota.deleteMany();
  await prisma.waitlistState.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cityStatus.deleteMany();
  await prisma.city.deleteMany();

  const nyc = await prisma.city.create({ data: { name: 'New York', zipPrefix: '100' } });
  const sf = await prisma.city.create({ data: { name: 'San Francisco', zipPrefix: '941' } });

  const pass = await bcrypt.hash('password123', 10);
  const benPass = await bcrypt.hash('Ben69', 10);
  for (let i = 1; i <= 30; i++) {
    const cityId = i < 20 ? nyc.id : sf.id;
    const gender = i % 2 === 0 ? 'female' : 'male';
    const physicality = 4 + (i % 6);
    const resources = 3 + (i % 5);
    const reliability = 3 + (i % 4);
    const safety = i % 3 === 0 ? 8 : 4;
    const age = 20 + (i % 18);
    const basePotential = scaleBasePotentialToMps(weightedMps({ physicality, resources, reliability, safety }));
    const user = await prisma.user.create({
      data: {
        email: `user${i}@demo.local`,
        passwordHash: pass,
        gender,
        age,
        zip: cityId === nyc.id ? '10001' : '94105',
        cityId,
        lastActiveAt: i <= 24 ? new Date() : new Date(Date.now() - 40 * 24 * 3600 * 1000),
        mps: basePotential,
        mpsCurrent: basePotential,
        basePotential: basePotential,
        basePotentialScore: basePotential,
        scorePhysicality: physicality,
        scoreResources: resources,
        scoreReliability: reliability,
        reliability: 0,
        reliabilityScore: 0.05,
        impressionsCount: 0,
        impressions_count: 0,
        likesCount: 0,
        likes_received_count: 0,
        likesReceivedCount: 0,
        scoreSafety: safety,
        dailyQuota: { create: { likesRemaining: 5, profilesShownToday: 0, shownUserIdsJson: '[]', peerReviewsCompleted: 0, resetAt: new Date() } },
        profile: {
          create: {
            bio: 'MVP profile',
            photoMainUrl: `https://picsum.photos/seed/${i}/400/400`,
            photoCapturedAt: new Date(),
            incomeSelfReported: 50000 + i * 1000,
            heightCm: 165 + (i % 20),
            weightKg: 55 + (i % 30),
            profileCompletion: 75,
            verificationStatus: i % 5 === 0 ? 'passed' : 'unverified',
            preloadedContact: null
          }
        },
        mpsHistory: { create: { mpsValue: basePotential, componentSnapshot: JSON.stringify({ physicality, resources, reliability, safety }) } },
        waitlistState: { create: { cityId } }
      }
    });

    await prisma.profileDailyStat.create({
      data: {
        profileUserId: user.id,
        statDate: todayKey(),
        likesReceived: i % 12
      }
    });
  }

  await prisma.user.create({
    data: {
      email: 'Ben',
      passwordHash: benPass,
      gender: 'male',
      age: 30,
      zip: '10001',
      cityId: nyc.id,
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
      scoreSafety: 5,
      dailyQuota: { create: { likesRemaining: 5, profilesShownToday: 0, shownUserIdsJson: '[]', peerReviewsCompleted: 0, resetAt: new Date() } },
      profile: {
        create: {
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
      },
      mpsHistory: {
        create: {
          mpsValue: 5,
          componentSnapshot: JSON.stringify({ physicality: 5, resources: 5, reliability: 5, safety: 5 })
        }
      },
      waitlistState: { create: { cityId: nyc.id } }
    }
  });

  const users = await prisma.user.findMany({ orderBy: { email: 'asc' } });
  const [u1, u2, u3, u4, u5, u6, u7, u8, u9, u10] = users;
  if (u1 && u2 && u3 && u4 && u5 && u6 && u7 && u8 && u9 && u10) {
    const staleCreatedAt = new Date(Date.now() - 73 * 3600 * 1000);
    await prisma.conversation.create({
      data: {
        pairKey: pairKey(u1.id, u2.id),
        participantAId: u1.id,
        participantBId: u2.id,
        state: 'active',
        createdAt: staleCreatedAt
      }
    });

    await prisma.conversation.create({
      data: {
        pairKey: pairKey(u3.id, u4.id),
        participantAId: u3.id,
        participantBId: u4.id,
        state: 'gated_to_video',
        messageCountTotal: 15,
        messageCountByA: 15,
        messageCountByB: 0,
        lastMessageAt: new Date()
      }
    });

    const capPartners = [u6, u7, u8, u9, u10];
    for (const partner of capPartners) {
      await prisma.conversation.create({
        data: {
          pairKey: pairKey(u5.id, partner.id),
          participantAId: u5.id,
          participantBId: partner.id,
          state: 'active',
          lastMessageAt: new Date()
        }
      });
    }
  }

  await refreshCityStatus();

  console.log('Seed complete. Login with a seeded account once session support is configured.');
}

main().finally(() => prisma.$disconnect());
