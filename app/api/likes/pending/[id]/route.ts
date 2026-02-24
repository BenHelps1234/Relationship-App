import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const like = await prisma.like.findUnique({
    where: { id: params.id },
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

  if (!like || like.toUserId !== userId) {
    return NextResponse.json({ error: 'Like not found' }, { status: 404 });
  }

  if (like.status !== 'pending') {
    return NextResponse.json({ error: 'Like not pending' }, { status: 400 });
  }

  if (!like.viewedAt) {
    await prisma.like.update({ where: { id: like.id }, data: { viewedAt: new Date() } });
  }

  return NextResponse.json({ like: { ...like, viewedAt: like.viewedAt ?? new Date() } });
}
