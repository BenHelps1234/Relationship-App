import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.accountStatus !== 'active') return new Response('Account not allowed.', { status: 403 });
  if (user.isFrozen) return new Response('Frozen users cannot pass profiles.', { status: 403 });

  const form = await req.formData();
  const targetUserId = String(form.get('targetUserId') || '');
  if (!targetUserId || targetUserId === userId) return new Response('Invalid pass target.', { status: 400 });

  try {
    await prisma.passSignal.upsert({
      where: { userId_targetUserId: { userId, targetUserId } },
      update: { createdAt: new Date() },
      create: { userId, targetUserId }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // no-op
    } else {
      throw error;
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  redirect('/discovery');
}
