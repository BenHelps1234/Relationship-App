import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { tierWeight } from '@/lib/mps';
import { getSessionUserId } from '@/lib/session-user';

function clampNormalized(value: number): number {
  return Math.max(-3, Math.min(3, Number(value.toFixed(2))));
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response('No user', { status: 400 });

  const form = await req.formData();
  const ratedUserId = String(form.get('ratedUserId'));
  const rawRating = Number(form.get('rating'));

  const prior = await prisma.peerReview.findMany({ where: { raterUserId: user.id } });
  const avg = prior.length ? prior.reduce((sum, p) => sum + p.rawRating, 0) / prior.length : rawRating;
  const normalized = clampNormalized(rawRating - avg);
  const weightApplied = tierWeight(user.mpsCurrent);

  await prisma.$transaction([
    prisma.peerReview.create({
      data: {
        raterUserId: user.id,
        ratedUserId,
        rawRating,
        normalizedRating: normalized,
        weightApplied
      }
    }),
    prisma.dailyQuota.update({ where: { userId: user.id }, data: { peerReviewsCompleted: { increment: 1 } } }),
    prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
  ]);

  redirect('/roadmap');
}
