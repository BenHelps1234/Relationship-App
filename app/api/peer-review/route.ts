import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDemoUser } from '@/lib/current-user';
import { tierWeight } from '@/lib/mps';

export async function POST(req: Request) {
  const user = await getDemoUser();
  if (!user) return new Response('No user', { status: 400 });
  const form = await req.formData();
  const ratedUserId = String(form.get('ratedUserId'));
  const rawRating = Number(form.get('rating'));

  const prior = await prisma.peerReview.findMany({ where: { raterUserId: user.id } });
  const avg = prior.length ? prior.reduce((sum, p) => sum + p.rawRating, 0) / prior.length : rawRating;
  const normalized = rawRating - avg;
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
    prisma.dailyQuota.update({ where: { userId: user.id }, data: { peerReviewsCompleted: { increment: 1 } } })
  ]);

  redirect('/roadmap');
}
