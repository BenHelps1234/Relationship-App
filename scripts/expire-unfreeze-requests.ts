import { prisma } from '@/lib/prisma';
import { dissolveFrozenPair, UNFREEZE_RESPONSE_WINDOW_MS } from '@/lib/freeze';

export async function runExpireUnfreezeRequests() {
  const now = new Date();
  const deadline = new Date(now.getTime() - UNFREEZE_RESPONSE_WINDOW_MS);
  const dueConversations = await prisma.conversation.findMany({
    where: {
      endedAt: null,
      contactShareProposedAt: { lte: deadline },
      OR: [
        { contactShareAcceptedByUserA: true, contactShareAcceptedByUserB: false },
        { contactShareAcceptedByUserA: false, contactShareAcceptedByUserB: true }
      ]
    },
    select: { participantAId: true, participantBId: true }
  });

  let dissolvedCount = 0;
  for (const convo of dueConversations) {
    await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({ where: { id: convo.participantAId } });
      const partner = await tx.user.findUnique({ where: { id: convo.participantBId } });
      if (!me || !partner) return;
      if (!me.isFrozen || !partner.isFrozen || me.partnerId !== partner.id || partner.partnerId !== me.id) return;
      await dissolveFrozenPair(me.id, partner.id, tx);
      dissolvedCount += 1;
    });
  }

  return { count: dissolvedCount };
}

async function main() {
  const result = await runExpireUnfreezeRequests();
  console.log(`Auto-dissolved frozen pairs: ${result.count}`);
}

if (require.main === module) {
  main().finally(() => prisma.$disconnect());
}
