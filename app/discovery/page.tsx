import { prisma } from '@/lib/prisma';
import { DAILY_PROFILE_LIMIT } from '@/lib/domain';
import { oddsYouMatch } from '@/lib/odds';
import { Nav } from '@/components/Nav';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session-user';
import { refreshCityStatus } from '@/lib/city';
import { todayKey } from '@/lib/daily-stats';

export default async function DiscoveryPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;

  await refreshCityStatus(user.cityId);
  const cityStatus = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  if ((cityStatus?.totalUsersActive ?? 0) < 1000) {
    return <main><Nav /><p className="card">Discovery locked for low-city liquidity. <Link href="/waitlist" className="underline">Go to waitlist.</Link></p></main>;
  }

  if ((user.dailyQuota?.peerReviewsCompleted ?? 0) < 2) {
    return <main><Nav /><p className="card">Complete 2 anonymous opposite-sex photo ratings first in <Link href="/roadmap" className="underline">Roadmap / Review Queue</Link>.</p></main>;
  }

  const quota = user.dailyQuota;
  const shownUserIds = quota ? JSON.parse(quota.shownUserIdsJson) as string[] : [];
  const hidden = await prisma.hiddenProfile.findMany({
    where: { userId: user.id },
    select: { hiddenUserId: true }
  });
  const hiddenUserIds = hidden.map((h) => h.hiddenUserId);
  const remainingSlots = Math.max(0, DAILY_PROFILE_LIMIT - (quota?.profilesShownToday ?? 0));

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [user.id, ...shownUserIds, ...hiddenUserIds] },
      isFrozen: false,
      accountStatus: 'active'
    },
    include: {
      profile: true,
      profileDailyStats: { where: { statDate: todayKey() }, take: 1 }
    },
    take: remainingSlots
  });

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
  const limitReached = remainingSlots <= 0;

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">Discovery 5x5</h1>
      <p className="card">Shown today: {shownCount}/25 | Likes left: {quota?.likesRemaining ?? 0}/5</p>
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
                <button className="underline">Like</button>
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
