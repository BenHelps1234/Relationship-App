import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <main><p>Unauthorized.</p></main>;

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  const canView = !!actor?.isAdmin;
  if (!canView) return <main><p>Forbidden.</p></main>;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      accountStatus: true,
      isPremium: true,
      mps: true,
      reliability: true,
      impressions_count: true,
      likes_received_count: true,
      likesCount: true,
      impressionsCount: true
    }
  });
  const queueAgg = await prisma.like.groupBy({
    by: ['toUserId'],
    where: { status: 'pending', expiresAt: { gt: new Date() } },
    _count: { _all: true }
  });
  const queueByUser = new Map<string, number>(queueAgg.map((g) => [g.toUserId, g._count._all]));
  const activeConversations = await prisma.conversation.findMany({
    where: { state: { in: ['active', 'gated_to_video'] }, endedAt: null },
    select: { participantAId: true, participantBId: true }
  });
  const activeMatchesByUser = new Map<string, number>();
  for (const c of activeConversations) {
    activeMatchesByUser.set(c.participantAId, (activeMatchesByUser.get(c.participantAId) ?? 0) + 1);
    activeMatchesByUser.set(c.participantBId, (activeMatchesByUser.get(c.participantBId) ?? 0) + 1);
  }

  return (
    <main className="space-y-3">
      <h1 className="text-xl">Admin Dashboard</h1>
      <p className="card">Admin access enabled.</p>
      <div className="overflow-x-auto card p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">MPS</th>
              <th className="p-2 text-left">Reliability</th>
              <th className="p-2 text-left">L/I Ratio</th>
              <th className="p-2 text-left">Active Matches</th>
              <th className="p-2 text-left">Pending Queue Size</th>
              <th className="p-2 text-left">Premium</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.mps.toFixed(2)}</td>
                <td className="p-2">{(u.reliability * 100).toFixed(1)}%</td>
                <td className="p-2">{u.impressions_count > 0 ? (u.likes_received_count / u.impressions_count).toFixed(3) : '0.000'}</td>
                <td className="p-2">{activeMatchesByUser.get(u.id) ?? 0}</td>
                <td className="p-2">{queueByUser.get(u.id) ?? 0}</td>
                <td className="p-2">
                  <form action="/api/admin/grant-premium" method="post">
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="isPremium" value={u.isPremium ? '0' : '1'} />
                    <button className="card w-full">{u.isPremium ? 'Revoke' : 'Grant'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
