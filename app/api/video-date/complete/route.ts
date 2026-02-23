import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

const MAX_VIDEO_MINUTES = 20;

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

  if (conversation.videoDateStatus !== 'scheduled' && conversation.videoDateStatus !== 'proposed') {
    return new Response('Video date not ready to complete.', { status: 400 });
  }

  if (conversation.videoDateStartsAt && conversation.videoDateEndsAt) {
    const durationMinutes = (conversation.videoDateEndsAt.getTime() - conversation.videoDateStartsAt.getTime()) / (60 * 1000);
    if (durationMinutes > MAX_VIDEO_MINUTES) {
      return new Response('Video date duration exceeds 20 minutes.', { status: 400 });
    }
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { videoDateStatus: 'completed' }
  });

  redirect(`/conversations/${conversationId}`);
}
