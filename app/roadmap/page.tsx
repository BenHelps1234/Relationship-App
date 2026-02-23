import { prisma } from '@/lib/prisma';
import { getDemoUser } from '@/lib/current-user';
import { mpsTier, roadmapActions, tierWeight } from '@/lib/mps';

export default async function RoadmapPage() {
  const user = await getDemoUser();
  if (!user) return <p>No user.</p>;
  const history = await prisma.mpsHistory.findMany({ where: { userId: user.id }, orderBy: { timestamp: 'asc' } });
  const opposites = await prisma.user.findMany({
    where: { gender: user.gender === 'male' ? 'female' : 'male', id: { not: user.id } },
    include: { profile: true },
    take: 2
  });

  return (
    <main className="space-y-3">
      <h1 className="text-xl">MPS Roadmap</h1>
      <p className="card">MPS: {user.mpsCurrent.toFixed(2)} ({mpsTier(user.mpsCurrent)})</p>
      <div className="card space-y-1">
        {roadmapActions({ physicality: user.scorePhysicality, resources: user.scoreResources, reliability: user.scoreReliability, safety: user.scoreSafety }).map((r) => (
          <p key={r.component} className="text-sm">{r.component}: {r.current.toFixed(2)} | Next: {r.nextAction} | Impact: +{r.projectedDelta}</p>
        ))}
      </div>
      <div className="card">
        <p>Progress log:</p>
        {history.map((h) => <p key={h.id} className="text-xs">{h.timestamp.toISOString()}: {h.mpsValue.toFixed(2)}</p>)}
      </div>
      <div className="space-y-2">
        <p className="font-semibold">Peer review queue (photo only, anonymous)</p>
        {opposites.map((o) => (
          <form key={o.id} action="/api/peer-review" method="post" className="card space-y-2">
            <img src={o.profile?.photoMainUrl} alt="rate" className="h-44 w-full rounded object-cover" />
            <input type="hidden" name="ratedUserId" value={o.id} />
            <p className="text-xs">No identity details shown. Weight for your rating tier now: {tierWeight(user.mpsCurrent)}x</p>
            <input className="card w-full" name="rating" type="number" min={1} max={10} defaultValue={5} />
            <button className="underline">Submit 1-10</button>
          </form>
        ))}
      </div>
    </main>
  );
}
