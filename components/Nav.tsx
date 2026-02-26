import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import { activeMatchCount } from '@/lib/match';

export async function Nav() {
  const userId = await getSessionUserId();
  const atMatchCap = userId ? (await activeMatchCount(userId)) >= 5 : false;
  const actor = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }) : null;
  const isAdmin = !!actor?.isAdmin;

  return (
    <nav className="mb-4 grid grid-cols-6 gap-2 text-center text-xs">
      <Link className="card" href="/discovery">Discovery</Link>
      {(!atMatchCap || isAdmin) ? <Link className="card" href="/likes-you">Likes You</Link> : null}
      <Link className="card" href="/strong-likes">Strong</Link>
      <Link className="card" href="/conversations">Chats</Link>
      <Link className="card" href="/roadmap">Roadmap</Link>
      {isAdmin ? <Link className="card" href="/admin">Admin</Link> : <Link className="card" href="/filters">Filters</Link>}
    </nav>
  );
}
