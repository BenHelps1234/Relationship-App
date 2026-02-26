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
  if (!userId) return new Response('Missing userId', { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: {
      impressionsCount: { increment: 10 },
      impressions_count: { increment: 10 },
      likesReceivedCount: { increment: 5 },
      likes_received_count: { increment: 5 }
    }
  });

  redirect('/admin');
}
