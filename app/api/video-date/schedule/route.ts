import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

const MAX_VIDEO_MINUTES = 20;
const MAX_SCHEDULE_DAYS = 7;

function startOfLocalDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData();
  const conversationId = String(form.get('conversationId') || '');
  const scheduledDateRaw = String(form.get('scheduledDate') || '');
  const startAtRaw = String(form.get('startAt') || '');
  const endAtRaw = String(form.get('endAt') || '');
  if (!conversationId) return new Response('Missing scheduling fields', { status: 400 });

  let startAt: Date;
  let endAt: Date;

  if (scheduledDateRaw) {
    const selectedDay = startOfLocalDay(new Date(`${scheduledDateRaw}T00:00:00`));
    if (Number.isNaN(selectedDay.getTime())) return new Response('Invalid schedule date.', { status: 400 });

    const today = startOfLocalDay(new Date());
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + MAX_SCHEDULE_DAYS);
    if (selectedDay < today || selectedDay > maxDate) {
      return new Response('Schedule must be within the next 7 days.', { status: 400 });
    }

    startAt = new Date(selectedDay);
    startAt.setHours(18, 0, 0, 0);
    endAt = new Date(startAt.getTime() + MAX_VIDEO_MINUTES * 60 * 1000);
  } else {
    if (!startAtRaw || !endAtRaw) return new Response('Missing scheduling fields', { status: 400 });
    startAt = new Date(startAtRaw);
    endAt = new Date(endAtRaw);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return new Response('Invalid schedule timestamps.', { status: 400 });
    }
    if (endAt <= startAt) return new Response('endAt must be later than startAt.', { status: 400 });
    const durationMinutes = (endAt.getTime() - startAt.getTime()) / (60 * 1000);
    if (durationMinutes > MAX_VIDEO_MINUTES) return new Response('Video date must be 20 minutes or less.', { status: 400 });
  }

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
