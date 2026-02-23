import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session-user';
import { Nav } from '@/components/Nav';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { activeMatchCount } from '@/lib/match';

export default async function StrongLikesPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;
  const activeMatches = await activeMatchCount(user.id);
  const atCap = activeMatches >= ACTIVE_CONVERSATION_LIMIT;

  const likes = await prisma.like.findMany({
    where: {
      toUserId: user.id,
      status: 'pending',
      type: 'strong',
      expiresAt: { gt: new Date() },
      fromUser: { accountStatus: 'active', isFrozen: false }
    },
    include: { fromUser: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">People Who Strong Liked You</h1>
      {atCap ? <p className="card">You are at 5 active matches. Accepting strong likes is paused until you end one.</p> : null}
      {likes.length === 0 ? <p className="card">No active strong likes right now.</p> : null}
      {likes.map((l) => {
        const remainingMs = l.expiresAt.getTime() - Date.now();
        const remainingHours = Math.max(0, Math.ceil(remainingMs / (3600 * 1000)));
        return (
          <div key={l.id} className="card space-y-2">
            <img src={l.fromUser.profile?.photoMainUrl} alt="strong liker" className="h-28 w-full rounded object-cover" />
            <p className="text-sm">Strong intent received. Expires in ~{remainingHours}h</p>
            <div className="grid grid-cols-2 gap-2">
              <form action="/api/strong-like-respond" method="post">
                <input type="hidden" name="likeId" value={l.id} />
                <input type="hidden" name="decision" value="accept" />
                <button className="card w-full" disabled={atCap}>Accept</button>
              </form>
              <form action="/api/strong-like-respond" method="post">
                <input type="hidden" name="likeId" value={l.id} />
                <input type="hidden" name="decision" value="pass" />
                <button className="card w-full">Pass</button>
              </form>
            </div>
          </div>
        );
      })}
    </main>
  );
}
