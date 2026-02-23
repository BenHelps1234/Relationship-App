import { prisma } from './prisma';

const GATE_HOURS = 24;

export function gateWindowStart(now = new Date()): Date {
  return new Date(now.getTime() - GATE_HOURS * 3600 * 1000);
}

export type PeerReviewGateState = {
  required: boolean;
  bypassedDueToExhaustion: boolean;
  message?: string;
};

export async function ensurePeerReviewGateState(userId: string): Promise<PeerReviewGateState> {
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { required: false, bypassedDueToExhaustion: false };

  const recent = await prisma.peerReview.findFirst({
    where: { raterUserId: userId, createdAt: { gte: gateWindowStart(now) } }
  });
  if (recent) return { required: false, bypassedDueToExhaustion: false };

  if (user.peerReviewBypassUntil && user.peerReviewBypassUntil > now) {
    return { required: false, bypassedDueToExhaustion: true, message: 'No reviews available right now. Gate bypass active for 24h.' };
  }

  const targetGenders =
    user.gender === 'male'
      ? ['female']
      : user.gender === 'female'
        ? ['male']
        : ['male', 'female'];

  const prior = await prisma.peerReview.findMany({
    where: { raterUserId: userId },
    select: { ratedUserId: true }
  });
  const ratedUserIds = prior.map((p) => p.ratedUserId);

  const availableCount = await prisma.user.count({
    where: {
      id: { notIn: [userId, ...ratedUserIds] },
      gender: { in: targetGenders },
      accountStatus: 'active',
      isFrozen: false
    }
  });

  if (availableCount > 0) return { required: true, bypassedDueToExhaustion: false };

  await prisma.user.update({
    where: { id: userId },
    data: { peerReviewBypassUntil: new Date(now.getTime() + GATE_HOURS * 3600 * 1000) }
  });
  return { required: false, bypassedDueToExhaustion: true, message: 'No reviews available right now. Gate bypass active for 24h.' };
}

