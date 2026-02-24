import { prisma } from '@/lib/prisma';
import { roadmapActions } from '@/lib/mps';
import { getSessionUser } from '@/lib/session-user';
import { effectiveCityThreshold, refreshCityStatus } from '@/lib/city';
import { Nav } from '@/components/Nav';
import { ensureWaitlistState, waitlistRank, WAITLIST_DAILY_REVIEW_CAP, waitlistReviewsTodayCount } from '@/lib/waitlist';

type WaitlistPageProps = {
  searchParams?: { jump?: string };
};

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
  const reviewsToday = await waitlistReviewsTodayCount(user.id);
  const canReview = reviewsToday < WAITLIST_DAILY_REVIEW_CAP;

  const prior = await prisma.peerReview.findMany({ where: { raterUserId: user.id }, select: { ratedUserId: true } });
  const ratedUserIds = prior.map((p) => p.ratedUserId);
  const candidates = !cityLocked || !canReview
    ? []
    : await prisma.user.findMany({
        where: {
          id: { notIn: [user.id, ...ratedUserIds] },
          accountStatus: 'active',
          isFrozen: false
        },
        include: { profile: true },
        take: 2
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
          <p>Each yes/no review increases your waitlist priority score by 1.</p>
          <p>Reviews completed today: {reviewsToday}/{WAITLIST_DAILY_REVIEW_CAP}</p>
        </div>
      ) : null}

      {cityLocked && canReview ? (
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
      {cityLocked && !canReview ? <p className="card">Daily waitlist review cap reached. Return tomorrow for more jumps.</p> : null}

      <div className="card">
        <h2 className="font-medium">Improvement Roadmap</h2>
        {roadmapActions({ physicality: user.scorePhysicality, resources: user.scoreResources, reliability: user.scoreReliability, safety: user.scoreSafety }).map((x) => (
          <p key={x.component} className="text-sm">{x.component}: {x.current.toFixed(1)} {'->'} {x.nextAction} ({x.projectedDelta > 0 ? '+' : ''}{x.projectedDelta})</p>
        ))}
      </div>
    </main>
  );
}
