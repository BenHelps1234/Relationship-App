import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { displayMpsOrCalibrating } from '@/services/market';

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
      isPremium: true,
      mps: true,
      reliability: true,
      impressionsCount: true
    }
  });
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
              <th className="p-2 text-left">Username</th>
              <th className="p-2 text-left">MPS</th>
              <th className="p-2 text-left">Reliability</th>
              <th className="p-2 text-left">Total Impressions</th>
              <th className="p-2 text-left">Match Count</th>
              <th className="p-2 text-left">Premium</th>
              <th className="p-2 text-left">Manual Signals</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: (typeof users)[number]) => (
              <tr key={u.id} className="border-b border-zinc-800">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{displayMpsOrCalibrating(u.mps, u.impressionsCount)}</td>
                <td className="p-2">{(u.reliability * 100).toFixed(1)}%</td>
                <td className="p-2">{u.impressionsCount}</td>
                <td className="p-2">{activeMatchesByUser.get(u.id) ?? 0}</td>
                <td className="p-2">
                  <p className="mb-1">{u.isPremium ? 'Premium: Yes' : 'Premium: No'}</p>
                  <form action="/api/admin/grant-premium" method="post">
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="isPremium" value={u.isPremium ? '0' : '1'} />
                    <button className="card w-full">{u.isPremium ? 'Revoke Premium' : 'Grant Premium'}</button>
                  </form>
                </td>
                <td className="p-2">
                  <form action="/api/admin/boost-signals" method="post">
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="card w-full">Add 10 Impressions / 5 Likes</button>
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
