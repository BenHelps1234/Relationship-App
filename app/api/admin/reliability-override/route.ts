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
  const mode = String(form.get('mode') || '');
  if (!userId || !mode) return new Response('Missing userId or mode', { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return new Response('Target user not found', { status: 404 });

  if (mode !== 'boost' && mode !== 'reset') return new Response('Invalid mode', { status: 400 });
  const reliability = 1.0;
  await prisma.user.update({
    where: { id: target.id },
    data: {
      reliability: reliability,
      reliabilityScore: reliability,
      scoreReliability: Number((reliability * 10).toFixed(2))
    }
  });

  redirect('/admin');
}
