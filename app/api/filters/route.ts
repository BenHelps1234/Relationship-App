import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.accountStatus !== 'active') return new Response('Account not allowed.', { status: 403 });

  const form = await req.formData();
  const preferredAgeMin = Number(form.get('preferredAgeMin'));
  const preferredAgeMax = Number(form.get('preferredAgeMax'));

  if (!Number.isInteger(preferredAgeMin) || !Number.isInteger(preferredAgeMax) || preferredAgeMin < 18 || preferredAgeMax < preferredAgeMin) {
    return new Response('Invalid age range.', { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { preferredAgeMin, preferredAgeMax, lastActiveAt: new Date() }
  });

  redirect('/discovery');
}
