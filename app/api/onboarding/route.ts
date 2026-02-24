import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { bmiScore, scaleBasePotentialToMps, weightedMps } from '@/lib/mps';

export async function POST(req: Request) {
  const body = await req.json();
  const age = Number(body.age);
  if (!Number.isInteger(age) || age < 18) {
    return NextResponse.json({ error: 'Age must be an integer and at least 18.' }, { status: 400 });
  }
  const zipPrefix = String(body.zip).slice(0, 3);
  const city = await prisma.city.findUnique({ where: { zipPrefix } });
  if (!city) return NextResponse.json({ error: 'Unknown zip prefix in seed city map.' }, { status: 400 });

  const hashed = await bcrypt.hash(body.password, 10);
  const physicality = bmiScore(body.weightKg, body.heightCm);
  const resources = Math.min(10, (Number(body.incomeSelfReported || 0) / 20000) * 2);
  const reliability = 1;
  const safety = 1;
  const basePotential = scaleBasePotentialToMps(weightedMps({ physicality, resources, reliability, safety }));

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hashed,
        gender: body.gender,
        age,
        contactEmail: body.contactEmail ? String(body.contactEmail) : null,
        contactPhone: body.contactPhone ? String(body.contactPhone) : null,
        zip: body.zip,
        cityId: city.id,
        mps: basePotential,
        mpsCurrent: basePotential,
        basePotential: basePotential,
        basePotentialScore: basePotential,
        reliability: 0,
        reliabilityScore: 0.05,
        impressionsCount: 0,
        impressions_count: 0,
        likesCount: 0,
        likes_received_count: 0,
        likesReceivedCount: 0,
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
            mpsValue: basePotential,
            componentSnapshot: JSON.stringify({ physicality, resources, reliability, safety })
          }
        },
        waitlistState: { create: { cityId: city.id } }
      }
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists.' }, { status: 400 });
    }
    throw error;
  }
}
