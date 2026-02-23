import { prisma } from '@/lib/prisma';
import { roadmapActions } from '@/lib/mps';
import { getSessionUser } from '@/lib/session-user';
import { effectiveCityThreshold, refreshCityStatus } from '@/lib/city';
import { Nav } from '@/components/Nav';
import { ensureWaitlistState, isEligibleForWaitlistJump, waitlistRank, WAITLIST_JUMP_REVIEWS_REQUIRED } from '@/lib/waitlist';

type WaitlistPageProps = {
  searchParams?: { jump?: string };
};

function countdownText(until: Date): string {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return 'Now';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;

  await refreshCityStatus(user.cityId);
  const status = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  const current = status?.totalUsersActive ?? 0;
  const threshold = effectiveCityThreshold(status?.threshold ?? 1000);
  const cityLocked = current < threshold;
  const pct = Math.min(100, Math.round((current / threshold) * 100));

  const state = await ensureWaitlistState(user.id, user.cityId);
  const rank = await waitlistRank(user.cityId, user.id);
  const eligibleNow = isEligibleForWaitlistJump(state.nextEligibleAt);
  const progress = Math.min(WAITLIST_JUMP_REVIEWS_REQUIRED, state.reviewsCompletedSinceLastGate);

  const prior = await prisma.peerReview.findMany({ where: { raterUserId: user.id }, select: { ratedUserId: true } });
  const ratedUserIds = prior.map((p) => p.ratedUserId);
  const remainingNeeded = Math.max(0, WAITLIST_JUMP_REVIEWS_REQUIRED - progress);

  const candidates = !cityLocked || !eligibleNow || remainingNeeded <= 0
    ? []
    : await prisma.user.findMany({
        where: {
          id: { notIn: [user.id, ...ratedUserIds] },
          accountStatus: 'active',
          isFrozen: false
        },
        include: { profile: true },
        take: remainingNeeded
      });

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl font-semibold">City Waitlist</h1>

      <div className="card">
        <p>{current} / {threshold} active users in your city.</p>
        <div className="mt-2 h-3 w-full rounded bg-zinc-700"><div className="h-3 rounded bg-emerald-400" style={{ width: `${pct}%` }} /></div>
      </div>

      {!cityLocked ? <p className="card">City unlocked. Discovery is available now.</p> : null}

      <div className="card space-y-1">
        <p>Your waitlist priority score: <strong>{state.priorityScore}</strong></p>
        <p>Your city rank: <strong>#{rank}</strong></p>
      </div>

      {searchParams?.jump === '1' ? <p className="card">You jumped ahead in the waitlist.</p> : null}

      {cityLocked ? (
        <div className="card space-y-2">
          <h2 className="font-medium">Complete peer reviews to jump ahead</h2>
          {eligibleNow ? (
            <>
              <p>Complete {WAITLIST_JUMP_REVIEWS_REQUIRED} yes/no reviews to jump ahead.</p>
              <p>{progress}/{WAITLIST_JUMP_REVIEWS_REQUIRED} completed for today's jump.</p>
            </>
          ) : (
            <p>Next jump eligibility in: {state.nextEligibleAt ? countdownText(state.nextEligibleAt) : 'Now'}</p>
          )}
        </div>
      ) : null}

      {cityLocked && eligibleNow ? (
        <div className="space-y-2">
          <p className="font-semibold">Waitlist review queue (cross-city, no repeats)</p>
          {candidates.length === 0 ? <p className="card">No reviews available right now.</p> : null}
          {candidates.map((o) => (
            <form key={o.id} action="/api/waitlist-review" method="post" className="card space-y-2">
              <img src={o.profile?.photoMainUrl} alt="rate" className="h-44 w-full rounded object-cover" />
              <input type="hidden" name="ratedUserId" value={o.id} />
              <div className="grid grid-cols-2 gap-2">
                <button className="card w-full" name="vote" value="yes">Yes</button>
                <button className="card w-full" name="vote" value="no">No</button>
              </div>
            </form>
          ))}
        </div>
      ) : null}

      <div className="card">
        <h2 className="font-medium">Improvement Roadmap</h2>
        {roadmapActions({ physicality: user.scorePhysicality, resources: user.scoreResources, reliability: user.scoreReliability, safety: user.scoreSafety }).map((x) => (
          <p key={x.component} className="text-sm">{x.component}: {x.current.toFixed(1)} -> {x.nextAction} ({x.projectedDelta > 0 ? '+' : ''}{x.projectedDelta})</p>
        ))}
      </div>
    </main>
  );
}
