import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import Link from 'next/link';
import { displayMpsOrCalibrating } from '@/services/market';

export default async function LikeDetailPage({ params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return <p>Unauthorized.</p>;

  const like = await prisma.like.findUnique({
    where: { id: params.id },
    include: { fromUser: { include: { profile: true } } }
  });
  if (!like || like.toUserId !== userId) return <p>Like not found.</p>;

  if (like.status !== 'pending') {
    return (
      <main className="space-y-3">
        <p className="card">This like is no longer pending.</p>
        <Link className="underline" href="/likes-you">Back</Link>
      </main>
    );
  }

  if (!like.viewedAt) {
    await prisma.like.update({ where: { id: like.id }, data: { viewedAt: new Date() } });
  }

  return (
    <main className="space-y-3">
      <h1 className="text-xl">Like Detail</h1>
      <img src={like.fromUser.profile?.photoMainUrl} alt="liker" className="h-64 w-full rounded object-cover" />
      <p className="card">Sender MPS: {displayMpsOrCalibrating(like.fromUser.mps, like.fromUser.impressions_count)}</p>
      <p className="card">Type: {like.type}</p>
      <p className="card">One-Look active: leaving without action moves this like to passed/expired.</p>
      <div className="grid grid-cols-2 gap-2">
        <form action="/api/like" method="post">
          <input type="hidden" name="toUserId" value={like.fromUserId} />
          <input type="hidden" name="type" value="direct" />
          <button className="card w-full">Match</button>
        </form>
        {like.type === 'strong' ? (
          <form action="/api/strong-like-respond" method="post">
            <input type="hidden" name="likeId" value={like.id} />
            <input type="hidden" name="decision" value="pass" />
            <button className="card w-full">Pass</button>
          </form>
        ) : (
          <form action="/api/pass" method="post">
            <input type="hidden" name="targetUserId" value={like.fromUserId} />
            <button className="card w-full">Pass</button>
          </form>
        )}
      </div>
      <Link className="underline" href="/likes-you">Back</Link>
    </main>
  );
}
