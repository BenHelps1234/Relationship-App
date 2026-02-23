import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { bmiScore, weightedMps } from '@/lib/mps';

export async function POST(req: Request) {
  const body = await req.json();
  const zipPrefix = String(body.zip).slice(0, 3);
  const city = await prisma.city.findUnique({ where: { zipPrefix } });
  if (!city) return NextResponse.json({ error: 'Unknown zip prefix in seed city map.' }, { status: 400 });

  const hashed = await bcrypt.hash(body.password, 10);
  const physicality = bmiScore(body.weightKg, body.heightCm);
  const resources = Math.min(10, (Number(body.incomeSelfReported || 0) / 20000) * 2);
  const reliability = 1;
  const safety = 1;
  const mps = weightedMps({ physicality, resources, reliability, safety });

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash: hashed,
      gender: body.gender,
      zip: body.zip,
      cityId: city.id,
      mpsCurrent: mps,
      scorePhysicality: physicality,
      scoreResources: resources,
      scoreReliability: reliability,
      scoreSafety: safety,
      lastActiveAt: new Date(),
      dailyQuota: { create: { likesRemaining: 5, profilesShownToday: 0, shownUserIdsJson: '[]', peerReviewsCompleted: 0, resetAt: new Date() } },
      profile: {
        create: {
          bio: body.bio,
          photoMainUrl: body.photoMainUrl || 'https://picsum.photos/300',
          photoCapturedAt: new Date(),
          incomeSelfReported: Number(body.incomeSelfReported || 0),
          heightCm: Number(body.heightCm || 0),
          weightKg: Number(body.weightKg || 0),
          profileCompletion: 70
        }
      },
      mpsHistory: {
        create: {
          mpsValue: mps,
          componentSnapshot: JSON.stringify({ physicality, resources, reliability, safety })
        }
      }
    }
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
