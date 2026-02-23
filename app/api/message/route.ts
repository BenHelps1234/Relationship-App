import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDemoUser } from '@/lib/current-user';
import { canSendMessage, conversationStateAfterMessage } from '@/lib/domain';

export async function POST(req: Request) {
  const user = await getDemoUser();
  if (!user) return new Response('No user', { status: 400 });
  if (user.isFrozen) return new Response('Frozen accounts cannot message.', { status: 403 });
  const form = await req.formData();
  const conversationId = String(form.get('conversationId'));
  const body = String(form.get('body') ?? '');

  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) return new Response('Not found', { status: 404 });
  if (!canSendMessage(convo.state, convo.messageCountTotal)) return new Response('Message cap reached', { status: 400 });

  const count = convo.messageCountTotal + 1;
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: user.id, body } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { messageCountTotal: count, state: conversationStateAfterMessage(count) } })
  ]);

  redirect(`/conversations/${conversationId}`);
}
