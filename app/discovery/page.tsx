import { prisma } from '@/lib/prisma';
import { DAILY_PROFILE_LIMIT } from '@/lib/domain';
import { oddsYouMatch } from '@/lib/odds';
import { Nav } from '@/components/Nav';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session-user';
import { effectiveCityThreshold, refreshCityStatus } from '@/lib/city';
import { todayKey } from '@/lib/daily-stats';
import { effectiveAgeRange } from '@/lib/filters';
import { ensurePeerReviewGateState } from '@/lib/peer-review';

export default async function DiscoveryPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;

  await refreshCityStatus(user.cityId);
  const cityStatus = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  const threshold = effectiveCityThreshold(cityStatus?.threshold ?? 1000);
  if ((cityStatus?.totalUsersActive ?? 0) < threshold) {
    return <main><Nav /><p className="card">Discovery locked for low-city liquidity. <Link href="/waitlist" className="underline">Go to waitlist.</Link></p></main>;
  }

  const gate = await ensurePeerReviewGateState(user.id);
  if (gate.required) {
    return <main><Nav /><p className="card">Complete 1 anonymous Yes/No peer review first in <Link href="/roadmap" className="underline">Roadmap / Review Queue</Link>.</p></main>;
  }

  const quota = user.dailyQuota;
  const shownUserIds = quota ? JSON.parse(quota.shownUserIdsJson) as string[] : [];
  const hidden = await prisma.hiddenProfile.findMany({
    where: { userId: user.id },
    select: { hiddenUserId: true }
  });
  const hiddenUserIds = hidden.map((h) => h.hiddenUserId);
  const remainingSlots = Math.max(0, DAILY_PROFILE_LIMIT - (quota?.profilesShownToday ?? 0));
  const ageRange = effectiveAgeRange(user.age, user.preferredAgeMin, user.preferredAgeMax);

  const invisibleLikesToViewer = await prisma.like.findMany({
    where: {
      toUserId: user.id,
      status: 'pending',
      type: 'invisible',
      expiresAt: { gt: new Date() }
    },
    select: { fromUserId: true }
  });
  const invisiblePriorityIds = Array.from(new Set(invisibleLikesToViewer.map((l) => l.fromUserId))).filter(
    (id) => id !== user.id && !shownUserIds.includes(id) && !hiddenUserIds.includes(id)
  );

  const priorityCandidates = invisiblePriorityIds.length === 0 ? [] : await prisma.user.findMany({
    where: {
      id: { in: invisiblePriorityIds },
      isFrozen: false,
      accountStatus: 'active',
      age: { gte: ageRange.min, lte: ageRange.max }
    },
    include: {
      profile: true,
      profileDailyStats: { where: { statDate: todayKey() }, take: 1 }
    },
    take: remainingSlots
  });

  const remainingAfterPriority = Math.max(0, remainingSlots - priorityCandidates.length);
  const normalCandidates = await prisma.user.findMany({
    where: {
      id: { notIn: [user.id, ...shownUserIds, ...hiddenUserIds, ...priorityCandidates.map((p) => p.id)] },
      isFrozen: false,
      accountStatus: 'active',
      age: { gte: ageRange.min, lte: ageRange.max }
    },
    include: {
      profile: true,
      profileDailyStats: { where: { statDate: todayKey() }, take: 1 }
    },
    take: remainingAfterPriority
  });
  const candidates = [...priorityCandidates, ...normalCandidates];

  if (quota && candidates.length > 0) {
    await prisma.dailyQuota.update({
      where: { userId: user.id },
      data: {
        profilesShownToday: { increment: candidates.length },
        shownUserIdsJson: JSON.stringify([...shownUserIds, ...candidates.map((c) => c.id)])
      }
    });
  }
  const shownCount = (quota?.profilesShownToday ?? 0) + candidates.length;
  const limitReached = shownCount >= DAILY_PROFILE_LIMIT;
  if (limitReached) {
    console.info(`[discovery] daily profile cap reached user=${user.id} shown=${shownCount}`);
  }

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">Discovery 5x5</h1>
      <p className="card">Shown today: {shownCount}/25 | Likes left: {quota?.likesRemaining ?? 0}/5</p>
      {gate.bypassedDueToExhaustion && gate.message ? <p className="card">{gate.message}</p> : null}
      {limitReached ? <p className="card">Daily profile limit reached. Come back after local midnight.</p> : null}
      <div className="grid grid-cols-5 gap-1">
        {candidates.slice(0, 25).map((p) => {
          const likesToday = p.profileDailyStats[0]?.likesReceived ?? 0;
          const odds = oddsYouMatch(user.mpsCurrent, p.mpsCurrent, likesToday);
          return (
            <div key={p.id} className="card p-2 text-[10px]">
              <img src={p.profile?.photoMainUrl} alt="profile" className="h-12 w-full rounded object-cover" />
              <p>Odds: {Math.round(odds.probability * 100)}%</p>
              {odds.warning ? <p className="text-amber-300">Far-tier like warning (neutral)</p> : null}
              {p.profile?.verificationStatus === 'passed' ? <p className="text-sky-300">Blue Tint badge</p> : null}
              <form action="/api/like" method="post">
                <input type="hidden" name="toUserId" value={p.id} />
                <input type="hidden" name="type" value="direct" />
                <button className="underline">Direct Like</button>
              </form>
              <form action="/api/like" method="post">
                <input type="hidden" name="toUserId" value={p.id} />
                <input type="hidden" name="type" value="invisible" />
                <button className="underline">Invisible Like</button>
              </form>
              <form action="/api/hide-profile" method="post">
                <input type="hidden" name="hiddenUserId" value={p.id} />
                <button className="underline">Never see again</button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}
