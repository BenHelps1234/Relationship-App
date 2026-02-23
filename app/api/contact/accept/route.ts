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
  if (!conversation.contactShareProposedAt && conversation.videoDateStatus !== 'completed' && conversation.state !== 'gated_to_video') {
    return new Response('Contact share has not been proposed.', { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { id: conversationId },
      data: conversation.participantAId === userId
        ? { contactShareAcceptedByUserA: true }
        : { contactShareAcceptedByUserB: true }
    });

    const updated = await tx.conversation.findUnique({ where: { id: conversationId } });
    if (!updated) return;
    if (updated.contactShareAcceptedByUserA && updated.contactShareAcceptedByUserB && !updated.contactInfoSharedAt) {
      await tx.conversation.update({
        where: { id: conversationId },
        data: { contactInfoSharedAt: new Date() }
      });
    }
  });

  redirect(`/conversations/${conversationId}`);
}
