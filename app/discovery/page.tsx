import { prisma } from '@/lib/prisma';
import { getDemoUser } from '@/lib/current-user';
import { DAILY_PROFILE_LIMIT } from '@/lib/domain';
import { oddsYouMatch } from '@/lib/odds';
import { Nav } from '@/components/Nav';
import Link from 'next/link';

export default async function DiscoveryPage() {
  const user = await getDemoUser();
  if (!user) return <p>Create a user in onboarding first.</p>;
  const cityStatus = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  if ((cityStatus?.totalUsersActive ?? 0) < 1000) {
    return <main><Nav /><p className="card">Discovery locked for low-city liquidity. <Link href="/waitlist" className="underline">Go to waitlist.</Link></p></main>;
  }

  if ((user.dailyQuota?.peerReviewsCompleted ?? 0) < 2) {
    return <main><Nav /><p className="card">Complete 2 anonymous opposite-sex photo ratings first in <Link href="/roadmap" className="underline">Roadmap / Review Queue</Link>.</p></main>;
  }

  const profiles = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      isFrozen: false,
      accountStatus: 'active'
    },
    include: { profile: true, receivedLikes: { where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } } },
    take: DAILY_PROFILE_LIMIT
  });

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">Discovery 5x5</h1>
      <p className="card">Shown today: {user.dailyQuota?.profilesShownToday ?? 0}/25 | Likes left: {user.dailyQuota?.likesRemaining ?? 0}/5</p>
      <div className="grid grid-cols-5 gap-1">
        {profiles.slice(0, 25).map((p) => {
          const odds = oddsYouMatch(user.mpsCurrent, p.mpsCurrent, p.receivedLikes.length);
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
            </div>
          );
        })}
      </div>
    </main>
  );
}
