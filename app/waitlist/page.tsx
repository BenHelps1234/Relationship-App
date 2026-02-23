import { prisma } from '@/lib/prisma';
import { roadmapActions } from '@/lib/mps';
import { getSessionUser } from '@/lib/session-user';
import { effectiveCityThreshold, refreshCityStatus } from '@/lib/city';

export default async function WaitlistPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;
  await refreshCityStatus(user.cityId);
  const status = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  const current = status?.totalUsersActive ?? 0;
  const threshold = effectiveCityThreshold(status?.threshold ?? 1000);
  const pct = Math.min(100, Math.round((current / threshold) * 100));

  return (
    <main className="space-y-3">
      <h1 className="text-xl font-semibold">City Waitlist</h1>
      <div className="card">
        <p>{current} / {threshold} active users in your city.</p>
        <div className="mt-2 h-3 w-full rounded bg-zinc-700"><div className="h-3 rounded bg-emerald-400" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="card">
        <h2 className="font-medium">Improvement Roadmap</h2>
        {roadmapActions({ physicality: user.scorePhysicality, resources: user.scoreResources, reliability: user.scoreReliability, safety: user.scoreSafety }).map((x) => (
          <p key={x.component} className="text-sm">{x.component}: {x.current.toFixed(1)} -> {x.nextAction} ({x.projectedDelta > 0 ? '+' : ''}{x.projectedDelta})</p>
        ))}
      </div>
    </main>
  );
}
