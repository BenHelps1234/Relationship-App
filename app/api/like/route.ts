import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDemoUser } from '@/lib/current-user';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';

export async function POST(req: Request) {
  const user = await getDemoUser();
  if (!user) return new Response('No user', { status: 400 });
  if (user.isFrozen) return new Response('Frozen accounts cannot like.', { status: 403 });
  const form = await req.formData();
  const toUserId = String(form.get('toUserId'));

  const quota = await prisma.dailyQuota.findUnique({ where: { userId: user.id } });
  if (!quota || quota.likesRemaining <= 0) return new Response('Daily like limit reached.', { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.like.create({
      data: {
        fromUserId: user.id,
        toUserId,
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
        status: 'pending'
      }
    });
    await tx.dailyQuota.update({ where: { userId: user.id }, data: { likesRemaining: { decrement: 1 } } });

    const reciprocal = await tx.like.findFirst({ where: { fromUserId: toUserId, toUserId: user.id, status: 'pending' } });
    if (reciprocal) {
      const activeConversations = await tx.conversation.count({
        where: {
          state: { in: ['active', 'gated_to_video'] },
          OR: [{ participantAId: user.id }, { participantBId: user.id }]
        }
      });
      if (activeConversations < ACTIVE_CONVERSATION_LIMIT) {
        await tx.like.updateMany({
          where: {
            OR: [
              { fromUserId: user.id, toUserId },
              { fromUserId: toUserId, toUserId: user.id }
            ]
          },
          data: { status: 'matched' }
        });
        await tx.conversation.create({ data: { participantAId: user.id, participantBId: toUserId, state: 'active' } });
      }
    }
  });

  redirect('/discovery');
}
