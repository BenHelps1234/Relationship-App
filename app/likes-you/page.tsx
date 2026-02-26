import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session-user';
import { Nav } from '@/components/Nav';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { activeMatchCount } from '@/lib/match';
import Link from 'next/link';

export default async function LikesYouPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;
  const activeMatches = await activeMatchCount(user.id);
  const atCap = !user.isAdmin && activeMatches >= ACTIVE_CONVERSATION_LIMIT;

  const likes = await prisma.like.findMany({
    where: {
      toUserId: user.id,
      status: 'pending',
      type: 'direct',
      expiresAt: { gt: new Date() },
      fromUser: { accountStatus: 'active', isFrozen: false }
    },
    include: { fromUser: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">Likes You</h1>
      {atCap ? <p className="card">You are at 5 active matches. Reciprocation is paused until you end one.</p> : null}
      {likes.length === 0 ? <p className="card">No active direct likes right now.</p> : null}
      {likes.map((l) => {
        const remainingMs = l.expiresAt.getTime() - Date.now();
        const remainingHours = Math.max(0, Math.ceil(remainingMs / (3600 * 1000)));
        return (
          <div key={l.id} className="card space-y-2">
            <img src={l.fromUser.profile?.photoMainUrl} alt="liker" className="h-28 w-full rounded object-cover" />
            <p className="text-sm">Someone liked you. Expires in ~{remainingHours}h</p>
            <Link href={`/likes-you/${l.id}`} className="underline text-xs">Open detail view</Link>
            <form action="/api/like" method="post">
              <input type="hidden" name="toUserId" value={l.fromUserId} />
              <input type="hidden" name="type" value="direct" />
              <button className="underline" disabled={atCap}>Reciprocate</button>
            </form>
          </div>
        );
      })}
    </main>
  );
}
