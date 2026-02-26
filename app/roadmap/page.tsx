import { prisma } from '@/lib/prisma';
import { mpsTier, roadmapActions } from '@/lib/mps';
import { getSessionUser } from '@/lib/session-user';
import { ensurePeerReviewGateState } from '@/lib/peer-review';
import { displayMpsOrCalibrating } from '@/services/market';
import { Suspense } from 'react';
import RoadmapAdviceSection, { RoadmapAdviceSkeleton } from '@/components/RoadmapAdviceSection';

export default async function RoadmapPage() {
  const user = await getSessionUser();
  if (!user) return <p>No user.</p>;
  const gate = await ensurePeerReviewGateState(user.id);
  const history = await prisma.mpsHistory.findMany({ where: { userId: user.id }, orderBy: { timestamp: 'asc' } });
  const targetGenders =
    user.gender === 'male'
      ? ['female']
      : user.gender === 'female'
        ? ['male']
        : ['male', 'female'];
  const prior = await prisma.peerReview.findMany({ where: { raterUserId: user.id }, select: { ratedUserId: true } });
  const ratedUserIds = prior.map((p) => p.ratedUserId);
  const opposites = await prisma.user.findMany({
    where: {
      gender: { in: targetGenders },
      id: { notIn: [user.id, ...ratedUserIds] },
      accountStatus: 'active',
      isFrozen: false
    },
    include: { profile: true },
    take: 2
  });
  const metricCandidates = [
    { label: 'Physicality', value: user.scorePhysicality },
    { label: 'Resources', value: user.scoreResources },
    { label: 'Safety', value: user.scoreSafety }
  ].sort((a, b) => a.value - b.value);
  const specificMetric = metricCandidates[0]?.label ?? 'Profile Quality';
  const dynamicTask =
    user.reliability > 0.5
      ? `Improve ${specificMetric}.`
      : 'Increase Activity.';

  return (
    <main className="space-y-3">
      <h1 className="text-xl">MPS Roadmap</h1>
      {user.isPremium ? (
        <>
          <p className="card">MPS: {displayMpsOrCalibrating(user.mps, user.impressions_count)} ({mpsTier(user.mps)})</p>
          <p className="card">Reliability: {(user.reliability * 100).toFixed(1)}%</p>
          <p className="card">Priority task: {dynamicTask}</p>
        </>
      ) : (
        <>
          <p className="card blur-sm select-none">MPS: 0.00 (Calibrating...)</p>
          <p className="card blur-sm select-none">Reliability: --%</p>
          <p className="card">Reveal My Market Rank</p>
        </>
      )}
      <div className={`card space-y-1 ${user.isPremium ? '' : 'blur-sm select-none'}`}>
        {roadmapActions({ physicality: user.scorePhysicality, resources: user.scoreResources, reliability: user.scoreReliability, safety: user.scoreSafety }).map((r) => (
          <p key={r.component} className="text-sm">{r.component}: {r.current.toFixed(2)} | Next: {r.nextAction} | Impact: +{r.projectedDelta}</p>
        ))}
      </div>
      <div className="card">
        <p>Progress log:</p>
        {history.map((h) => <p key={h.id} className="text-xs">{h.timestamp.toISOString()}: {h.mpsValue.toFixed(2)}</p>)}
      </div>
      <Suspense fallback={<RoadmapAdviceSkeleton />}>
        <RoadmapAdviceSection user={user} />
      </Suspense>
      <div className="space-y-2">
        <p className="font-semibold">Peer review queue (photo only, anonymous, Yes/No)</p>
        {gate.bypassedDueToExhaustion && gate.message ? <p className="card">{gate.message}</p> : null}
        {opposites.length === 0 ? <p className="card">No reviews available right now.</p> : null}
        {opposites.map((o) => (
          <form key={o.id} action="/api/peer-review" method="post" className="card space-y-2">
            <img src={o.profile?.photoMainUrl} alt="rate" className="h-44 w-full rounded object-cover" />
            <input type="hidden" name="ratedUserId" value={o.id} />
            <p className="text-xs">No identity details shown. Equal-weight Yes/No review.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="card w-full" name="vote" value="yes">Yes</button>
              <button className="card w-full" name="vote" value="no">No</button>
            </div>
          </form>
        ))}
      </div>
    </main>
  );
}
