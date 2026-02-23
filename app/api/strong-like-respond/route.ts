import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import { pairKey } from '@/lib/pairs';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { activeMatchCount } from '@/lib/match';

async function activeConversationCount(userId: string): Promise<number> {
  return activeMatchCount(userId);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const form = await req.formData();
  const likeId = String(form.get('likeId') || '');
  const decision = String(form.get('decision') || '');

  const like = await prisma.like.findUnique({ where: { id: likeId } });
  if (!like || like.toUserId !== userId || like.type !== 'strong' || like.status !== 'pending') {
    return new Response('Strong like not available.', { status: 404 });
  }

  if (decision === 'pass') {
    await prisma.like.update({ where: { id: like.id }, data: { status: 'expired' } });
    redirect('/strong-likes');
  }

  if (decision !== 'accept') return new Response('Invalid decision', { status: 400 });

  const fromUser = await prisma.user.findUnique({ where: { id: like.fromUserId } });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!fromUser || !me || fromUser.accountStatus !== 'active' || fromUser.isFrozen || me.accountStatus !== 'active' || me.isFrozen) {
    return new Response('Users unavailable for accept.', { status: 400 });
  }

  const myCap = await activeConversationCount(userId);
  const theirCap = await activeConversationCount(fromUser.id);
  if (myCap >= ACTIVE_CONVERSATION_LIMIT || theirCap >= ACTIVE_CONVERSATION_LIMIT) {
    return new Response('Conversation cap reached. Resolve existing chats first.', { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const myCount = await activeMatchCount(userId, tx);
      const theirCount = await activeMatchCount(fromUser.id, tx);
      if (myCount >= ACTIVE_CONVERSATION_LIMIT || theirCount >= ACTIVE_CONVERSATION_LIMIT) {
        throw new Error('CAP_REACHED');
      }

      await tx.like.update({ where: { id: like.id }, data: { status: 'matched' } });
      await tx.like.upsert({
        where: { fromUserId_toUserId: { fromUserId: userId, toUserId: fromUser.id } },
        update: { status: 'matched', type: 'direct', expiresAt: new Date(Date.now() + 48 * 3600 * 1000) },
        create: { fromUserId: userId, toUserId: fromUser.id, status: 'matched', type: 'direct', expiresAt: new Date(Date.now() + 48 * 3600 * 1000) }
      });

      const key = pairKey(userId, fromUser.id);
      const convo = await tx.conversation.findUnique({ where: { pairKey: key } });
      if (!convo) {
        await tx.conversation.create({ data: { pairKey: key, participantAId: userId, participantBId: fromUser.id, state: 'active' } });
      }
      await tx.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CAP_REACHED') {
      return new Response('Conversation cap reached. Resolve existing chats first.', { status: 400 });
    }
    throw error;
  }

  redirect('/conversations');
}
