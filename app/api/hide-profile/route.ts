import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: userId } });
  if (!actor || actor.accountStatus !== 'active') return new Response('Account not allowed.', { status: 403 });

  const form = await req.formData();
  const hiddenUserId = String(form.get('hiddenUserId') || '');
  if (!hiddenUserId || hiddenUserId === userId) return new Response('Invalid hidden user', { status: 400 });

  await prisma.hiddenProfile.upsert({
    where: { userId_hiddenUserId: { userId, hiddenUserId } },
    update: {},
    create: { userId, hiddenUserId }
  });

  redirect('/discovery');
}
