import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { canSendMessage, conversationStateAfterMessage } from '@/lib/domain';
import { getSessionUserId } from '@/lib/session-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response('No user', { status: 400 });
  if (user.accountStatus !== 'active') {
    console.warn(`[message] blocked banned/inactive user=${user.id}`);
    return new Response('Account not allowed.', { status: 403 });
  }
  if (user.isFrozen) {
    console.warn(`[message] blocked frozen user=${user.id}`);
    return new Response('Frozen accounts cannot message.', { status: 403 });
  }

  const form = await req.formData();
  const conversationId = String(form.get('conversationId'));
  const body = String(form.get('body') ?? '');

  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) return new Response('Not found', { status: 404 });
  const isParticipant = convo.participantAId === user.id || convo.participantBId === user.id;
  if (!isParticipant) return new Response('Forbidden', { status: 403 });
  if (!canSendMessage(convo.state, convo.messageCountTotal)) {
    console.info(`[message] gate block conversation=${conversationId} count=${convo.messageCountTotal}`);
    return new Response('Message cap reached', { status: 400 });
  }

  const count = convo.messageCountTotal + 1;
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: user.id, body } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { messageCountTotal: count, state: conversationStateAfterMessage(count) } }),
    prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
  ]);

  redirect(`/conversations/${conversationId}`);
}
