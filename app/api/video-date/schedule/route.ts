import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

const MAX_VIDEO_MINUTES = 20;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData();
  const conversationId = String(form.get('conversationId') || '');
  const startAtRaw = String(form.get('startAt') || '');
  const endAtRaw = String(form.get('endAt') || '');
  if (!conversationId || !startAtRaw || !endAtRaw) return new Response('Missing scheduling fields', { status: 400 });

  const startAt = new Date(startAtRaw);
  const endAt = new Date(endAtRaw);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return new Response('Invalid schedule timestamps.', { status: 400 });
  }
  if (endAt <= startAt) return new Response('endAt must be later than startAt.', { status: 400 });
  const durationMinutes = (endAt.getTime() - startAt.getTime()) / (60 * 1000);
  if (durationMinutes > MAX_VIDEO_MINUTES) return new Response('Video date must be 20 minutes or less.', { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return new Response('Conversation not found', { status: 404 });
  const isParticipant = conversation.participantAId === userId || conversation.participantBId === userId;
  if (!isParticipant) return new Response('Forbidden', { status: 403 });
  if (conversation.state !== 'gated_to_video') return new Response('Conversation is not gated to video.', { status: 400 });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      videoDateStatus: 'scheduled',
      videoDateStartsAt: startAt,
      videoDateEndsAt: endAt
    }
  });

  redirect(`/conversations/${conversationId}`);
}
