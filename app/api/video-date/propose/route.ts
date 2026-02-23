import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData();
  const conversationId = String(form.get('conversationId') || '');
  if (!conversationId) return new Response('Missing conversationId', { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return new Response('Conversation not found', { status: 404 });

  const isParticipant = conversation.participantAId === userId || conversation.participantBId === userId;
  if (!isParticipant) return new Response('Forbidden', { status: 403 });
  if (conversation.state !== 'gated_to_video') return new Response('Conversation is not gated to video.', { status: 400 });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { videoDateStatus: 'proposed' }
  });

  redirect(`/conversations/${conversationId}`);
}
