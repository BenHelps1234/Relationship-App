import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor || !actor.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await req.formData();
  const userId = String(form.get('userId') || '');
  const isPremiumRaw = String(form.get('isPremium') || '');
  if (!userId) return new Response('Missing userId', { status: 400 });
  if (isPremiumRaw !== '0' && isPremiumRaw !== '1') return new Response('Invalid premium value', { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: isPremiumRaw === '1',
      subscriptionActive: isPremiumRaw === '1'
    }
  });

  redirect('/admin');
}
