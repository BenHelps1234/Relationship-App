import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { activeMatchCount } from '@/lib/match';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (await activeMatchCount(userId) >= ACTIVE_CONVERSATION_LIMIT) {
    return NextResponse.json({ error: 'Locked', status: 'LOCKED' }, { status: 403 });
  }

  await prisma.like.updateMany({
    where: {
      toUserId: userId,
      type: 'strong',
      status: 'pending',
      viewedAt: { not: null }
    },
    data: { status: 'expired' }
  });

  const likes = await prisma.like.findMany({
    where: {
      toUserId: userId,
      status: 'pending',
      expiresAt: { gt: new Date() },
      fromUser: { accountStatus: 'active', isFrozen: false }
    },
    include: {
      fromUser: {
        select: {
          id: true,
          email: true,
          mps: true,
          reliability: true,
          profile: { select: { photoMainUrl: true } }
        }
      }
    }
  });
  likes.sort((a, b) => {
    const typeRank = (v: string) => (v === 'strong' ? 3 : v === 'invisible' ? 2 : 1);
    const byType = typeRank(b.type) - typeRank(a.type);
    if (byType !== 0) return byType;
    const byMps = b.fromUser.mps - a.fromUser.mps;
    if (byMps !== 0) return byMps;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return NextResponse.json({ likes });
}
