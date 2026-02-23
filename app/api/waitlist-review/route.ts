import { redirect } from 'next/navigation';
import { PeerVote, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import { effectiveCityThreshold, refreshCityStatus } from '@/lib/city';
import { ensureWaitlistState, WAITLIST_DAILY_REVIEW_CAP, waitlistReviewsTodayCount } from '@/lib/waitlist';

const MIN_SECONDS_BETWEEN_REVIEWS = 5;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response('User not found', { status: 404 });
  if (user.accountStatus !== 'active') return new Response('Account not allowed.', { status: 403 });
  if (user.isFrozen) return new Response('Frozen users cannot review.', { status: 403 });

  await refreshCityStatus(user.cityId);
  const cityStatus = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  const threshold = effectiveCityThreshold(cityStatus?.threshold ?? 1000);
  const cityLocked = (cityStatus?.totalUsersActive ?? 0) < threshold;
  if (!cityLocked) return new Response('City is unlocked; waitlist jump reviews are disabled.', { status: 400 });

  const form = await req.formData();
  const ratedUserId = String(form.get('ratedUserId') || '');
  const voteRaw = String(form.get('vote') || '').toLowerCase();
  const vote = voteRaw === 'yes' ? PeerVote.yes : voteRaw === 'no' ? PeerVote.no : null;
  if (!ratedUserId || !vote) return new Response('Invalid review payload.', { status: 400 });
  if (ratedUserId === user.id) return new Response('Cannot review yourself.', { status: 400 });

  const ratedUser = await prisma.user.findUnique({ where: { id: ratedUserId } });
  if (!ratedUser || ratedUser.accountStatus !== 'active' || ratedUser.isFrozen) {
    return new Response('Rated user unavailable.', { status: 400 });
  }

  const recent = await prisma.peerReview.findFirst({
    where: {
      raterUserId: user.id,
      createdAt: { gte: new Date(Date.now() - MIN_SECONDS_BETWEEN_REVIEWS * 1000) }
    },
    orderBy: { createdAt: 'desc' }
  });
  if (recent) return new Response('Please wait a moment before reviewing again.', { status: 429 });
  const reviewsToday = await waitlistReviewsTodayCount(user.id);
  if (reviewsToday >= WAITLIST_DAILY_REVIEW_CAP) {
    return new Response('Daily waitlist review cap reached.', { status: 400 });
  }

  await ensureWaitlistState(user.id, user.cityId);

  let jumped = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.peerReview.create({
        data: {
          raterUserId: user.id,
          ratedUserId,
          vote
        }
      });

      const state = await tx.waitlistState.findUnique({ where: { userId: user.id } });
      if (!state) throw new Error('missing_waitlist_state');

      const now = new Date();
      jumped = true;
      await tx.waitlistState.update({
        where: { userId: user.id },
        data: {
          priorityScore: { increment: 1 },
          priorityUpdatedAt: now,
          reviewsCompletedSinceLastGate: { increment: 1 },
          totalReviewsCompletedLifetime: { increment: 1 }
        }
      });

      await tx.user.update({ where: { id: user.id }, data: { lastActiveAt: now } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new Response('You already reviewed this user.', { status: 400 });
    }
    throw error;
  }

  redirect(jumped ? '/waitlist?jump=1' : '/waitlist');
}
