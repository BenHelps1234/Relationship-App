import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import { ensureDailyQuotaFresh } from '@/lib/quota';
import { gateWindowStart } from '@/lib/peer-review';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  await ensureDailyQuotaFresh(userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response('No user', { status: 400 });
  if (user.accountStatus !== 'active') return new Response('Account not allowed.', { status: 403 });
  if (user.isFrozen) return new Response('Frozen accounts cannot peer-review.', { status: 403 });

  const recent = await prisma.peerReview.findFirst({
    where: { raterUserId: user.id, createdAt: { gte: gateWindowStart() } }
  });
  if (recent) return new Response('Peer review already completed in the last 24 hours.', { status: 400 });

  const form = await req.formData();
  const ratedUserId = String(form.get('ratedUserId'));
  const voteRaw = String(form.get('vote') || '').toLowerCase();
  const voteYes = voteRaw === 'yes' ? true : voteRaw === 'no' ? false : null;
  if (voteYes === null) return new Response('Invalid vote.', { status: 400 });
  const ratedUser = await prisma.user.findUnique({ where: { id: ratedUserId } });
  if (!ratedUser || ratedUser.accountStatus !== 'active' || ratedUser.isFrozen) {
    return new Response('Rated user unavailable.', { status: 400 });
  }
  const validTarget =
    (user.gender === 'male' && ratedUser.gender === 'female') ||
    (user.gender === 'female' && ratedUser.gender === 'male') ||
    (user.gender === 'non_binary' && ['male', 'female'].includes(ratedUser.gender));
  if (!validTarget) return new Response('Invalid peer-review target.', { status: 400 });

  try {
    await prisma.$transaction([
      prisma.peerReview.create({
        data: {
          raterUserId: user.id,
          ratedUserId,
          voteYes
        }
      }),
      prisma.dailyQuota.update({ where: { userId: user.id }, data: { peerReviewsCompleted: { increment: 1 } } }),
      prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date(), peerReviewBypassUntil: null } })
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new Response('You have already reviewed this profile.', { status: 400 });
    }
    throw error;
  }

  redirect('/roadmap');
}
