import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response('No user', { status: 400 });

  const form = await req.formData();
  const action = String(form.get('action') || 'freeze');

  if (action === 'unfreeze') {
    await prisma.user.update({ where: { id: user.id }, data: { isFrozen: false, partnerId: null } });
    redirect('/freeze');
  }

  const partnerId = String(form.get('partnerId'));
  if (!partnerId) return new Response('Missing partnerId', { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { isFrozen: true, partnerId } }),
    prisma.user.update({ where: { id: partnerId }, data: { isFrozen: true, partnerId: user.id } })
  ]);

  redirect('/freeze');
}
