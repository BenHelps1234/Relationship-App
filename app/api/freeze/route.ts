import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import { dissolveFrozenPair, UNFREEZE_RESPONSE_WINDOW_MS } from '@/lib/freeze';
import { pairKey } from '@/lib/pairs';

function pendingUnfreezeRequest(conversation: {
  participantAId: string;
  participantBId: string;
  contactShareProposedAt: Date | null;
  contactShareAcceptedByUserA: boolean;
  contactShareAcceptedByUserB: boolean;
}) {
  if (!conversation.contactShareProposedAt) return null;
  const initiatorId = conversation.contactShareAcceptedByUserA && !conversation.contactShareAcceptedByUserB
    ? conversation.participantAId
    : conversation.contactShareAcceptedByUserB && !conversation.contactShareAcceptedByUserA
      ? conversation.participantBId
      : null;
  if (!initiatorId) return null;
  const expiresAt = new Date(conversation.contactShareProposedAt.getTime() + UNFREEZE_RESPONSE_WINDOW_MS);
  return { initiatorId, expiresAt };
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response('No user', { status: 400 });
  if (user.accountStatus !== 'active') return new Response('Account not allowed.', { status: 403 });

  const form = await req.formData();
  const action = String(form.get('action') || 'freeze');
  const now = new Date();
  const currentKey = user.partnerId ? pairKey(user.id, user.partnerId) : null;
  const currentConversation = currentKey
    ? await prisma.conversation.findUnique({ where: { pairKey: currentKey } })
    : null;
  const currentPendingRequest = currentConversation ? pendingUnfreezeRequest(currentConversation) : null;
  if (user.isFrozen && user.partnerId && currentPendingRequest && currentPendingRequest.expiresAt <= now) {
    await prisma.$transaction(async (tx) => {
      await dissolveFrozenPair(user.id, user.partnerId as string, tx);
    });
    redirect('/freeze?status=dissolved');
  }

  if (action === 'request_unfreeze') {
    if (!user.isFrozen || !user.partnerId) return new Response('No frozen partner found.', { status: 400 });
    const partner = await prisma.user.findUnique({ where: { id: user.partnerId } });
    if (!partner || !partner.isFrozen || partner.partnerId !== user.id) {
      return new Response('Frozen partner relationship is out of sync.', { status: 400 });
    }
    const convoKey = pairKey(user.id, partner.id);
    const conversation = await prisma.conversation.upsert({
      where: { pairKey: convoKey },
      update: { endedAt: null },
      create: { pairKey: convoKey, participantAId: user.id, participantBId: partner.id, state: 'active' }
    });
    const pending = pendingUnfreezeRequest(conversation);
    if (pending && pending.expiresAt > now) {
      redirect('/freeze?status=request-already-open');
    }

    await prisma.conversation.update({
      where: { pairKey: convoKey },
      data: {
        contactShareProposedAt: now,
        contactShareAcceptedByUserA: conversation.participantAId === user.id,
        contactShareAcceptedByUserB: conversation.participantBId === user.id
      }
    });
    redirect('/freeze?status=requested');
  }

  if (action === 'confirm_unfreeze') {
    if (!user.isFrozen || !user.partnerId) return new Response('No frozen partner found.', { status: 400 });
    const convoKey = pairKey(user.id, user.partnerId);
    const conversation = await prisma.conversation.findUnique({ where: { pairKey: convoKey } });
    if (!conversation) {
      return new Response('Frozen conversation not found.', { status: 400 });
    }
    const pending = pendingUnfreezeRequest(conversation);
    if (!pending) {
      return new Response('No pending unfreeze request.', { status: 400 });
    }
    if (pending.initiatorId === user.id) {
      return new Response('Only the non-initiating partner can confirm.', { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({ where: { id: user.id } });
      if (!me?.partnerId) throw new Error('No partner');
      await dissolveFrozenPair(user.id, me.partnerId, tx);
    });
    redirect('/freeze?status=dissolved');
  }

  if (action === 'keep_frozen') {
    if (!user.isFrozen || !user.partnerId) return new Response('No frozen partner found.', { status: 400 });
    const convoKey = pairKey(user.id, user.partnerId);
    const conversation = await prisma.conversation.findUnique({ where: { pairKey: convoKey } });
    if (!conversation) {
      return new Response('Frozen conversation not found.', { status: 400 });
    }
    const pending = pendingUnfreezeRequest(conversation);
    if (!pending) {
      return new Response('No pending unfreeze request.', { status: 400 });
    }
    if (pending.initiatorId === user.id) {
      return new Response('Only the non-initiating partner can dismiss.', { status: 400 });
    }

    await prisma.conversation.update({
      where: { pairKey: convoKey },
      data: {
        contactShareProposedAt: null,
        contactShareAcceptedByUserA: false,
        contactShareAcceptedByUserB: false
      }
    });
    redirect('/freeze?status=kept');
  }

  const partnerId = String(form.get('partnerId'));
  if (!partnerId) return new Response('Missing partnerId', { status: 400 });
  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner || partner.accountStatus !== 'active') return new Response('Partner unavailable.', { status: 400 });
  if (user.isFrozen || partner.isFrozen) return new Response('One of the users is already frozen.', { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { isFrozen: true, partnerId }
    }),
    prisma.user.update({
      where: { id: partnerId },
      data: { isFrozen: true, partnerId: user.id }
    }),
    prisma.conversation.upsert({
      where: { pairKey: pairKey(user.id, partnerId) },
      update: {
        endedAt: null,
        contactShareProposedAt: null,
        contactShareAcceptedByUserA: false,
        contactShareAcceptedByUserB: false
      },
      create: {
        pairKey: pairKey(user.id, partnerId),
        participantAId: user.id,
        participantBId: partnerId,
        state: 'active'
      }
    })
  ]);

  redirect('/freeze?status=frozen');
}
