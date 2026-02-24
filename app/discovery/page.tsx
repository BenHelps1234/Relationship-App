import { prisma } from '@/lib/prisma';
import { DAILY_PROFILE_LIMIT } from '@/lib/domain';
import { mpsTier } from '@/lib/mps';
import { Nav } from '@/components/Nav';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session-user';
import { effectiveCityThreshold, refreshCityStatus } from '@/lib/city';
import { effectiveAgeRange } from '@/lib/filters';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { activeMatchCount } from '@/lib/match';
import { displayMpsOrCalibrating, matchProbability } from '@/services/market';

type Candidate = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

const TIER_INDEX: Record<ReturnType<typeof mpsTier>, number> = {
  Developing: 1,
  Competitive: 2,
  Elite: 3
};

function uniqueIdsInOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export default async function DiscoveryPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;

  await refreshCityStatus(user.cityId);
  const cityStatus = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  const threshold = effectiveCityThreshold(cityStatus?.threshold ?? 1000);
  if ((cityStatus?.totalUsersActive ?? 0) < threshold) {
    return <main><Nav /><p className="card">Discovery locked for low-city liquidity. <Link href="/waitlist" className="underline">Go to waitlist.</Link></p></main>;
  }
  const viewerActiveMatches = await activeMatchCount(user.id);
  if (viewerActiveMatches >= ACTIVE_CONVERSATION_LIMIT) {
    return (
      <main>
        <Nav />
        <p className="card">You are at 5 active matches. Resolve one conversation to return to discovery.</p>
      </main>
    );
  }

  const quota = user.dailyQuota;
  const shownUserIds = quota ? JSON.parse(quota.shownUserIdsJson) as string[] : [];
  const hidden = await prisma.hiddenProfile.findMany({ where: { userId: user.id }, select: { hiddenUserId: true } });
  const hiddenUserIds = hidden.map((h) => h.hiddenUserId);
  const remainingSlots = Math.max(0, DAILY_PROFILE_LIMIT - (quota?.profilesShownToday ?? 0));
  const ageRange = effectiveAgeRange(user.age, user.preferredAgeMin, user.preferredAgeMax);

  const exclusionIds = new Set<string>([user.id, ...shownUserIds, ...hiddenUserIds]);
  const activeConversations = await prisma.conversation.findMany({
    where: { state: { in: ['active', 'gated_to_video'] }, endedAt: null },
    select: { participantAId: true, participantBId: true }
  });
  const activeCounts = new Map<string, number>();
  for (const c of activeConversations) {
    activeCounts.set(c.participantAId, (activeCounts.get(c.participantAId) ?? 0) + 1);
    activeCounts.set(c.participantBId, (activeCounts.get(c.participantBId) ?? 0) + 1);
  }
  const atCapIds = new Set(
    Array.from(activeCounts.entries())
      .filter(([, count]) => count >= ACTIVE_CONVERSATION_LIMIT)
      .map(([id]) => id)
  );

  const strongLikeSenders = await prisma.like.findMany({
    where: {
      toUserId: user.id,
      status: 'pending',
      type: 'strong',
      expiresAt: { gt: new Date() }
    },
    include: { fromUser: true }
  });
  const strongSenderIds = uniqueIdsInOrder(
    strongLikeSenders
      .filter((l) => l.fromUser.cityId === user.cityId)
      .sort((a, b) => b.fromUser.mps - a.fromUser.mps)
      .map((l) => l.fromUserId)
  ).filter((id) => !exclusionIds.has(id));
  const strongSenderIdsEligible = strongSenderIds.filter((id) => !atCapIds.has(id));

  const strongCandidates = strongSenderIdsEligible.length === 0 ? [] : await prisma.user.findMany({
    where: {
      id: { in: strongSenderIdsEligible },
      cityId: user.cityId,
      accountStatus: 'active',
      isFrozen: false,
      age: { gte: ageRange.min, lte: ageRange.max }
    },
    include: { profile: true },
    take: remainingSlots
  });
  for (const c of strongCandidates) exclusionIds.add(c.id);

  const remainingAfterStrong = Math.max(0, remainingSlots - strongCandidates.length);
  const invisibleLikeSenders = await prisma.like.findMany({
    where: {
      toUserId: user.id,
      status: 'pending',
      type: 'invisible',
      expiresAt: { gt: new Date() }
    },
    include: { fromUser: true }
  });
  const invisibleSenderIds = uniqueIdsInOrder(
    invisibleLikeSenders
      .filter((l) => l.fromUser.cityId === user.cityId)
      .sort((a, b) => b.fromUser.mps - a.fromUser.mps)
      .map((l) => l.fromUserId)
  ).filter((id) => !exclusionIds.has(id));
  const invisibleSenderIdsEligible = invisibleSenderIds.filter((id) => !atCapIds.has(id));

  const invisibleInjectionLimit = Math.min(remainingAfterStrong, 5);
  const invisibleCandidates = invisibleSenderIdsEligible.length === 0 ? [] : await prisma.user.findMany({
    where: {
      id: { in: invisibleSenderIdsEligible },
      cityId: user.cityId,
      accountStatus: 'active',
      isFrozen: false,
      age: { gte: ageRange.min, lte: ageRange.max }
    },
    include: { profile: true },
    take: invisibleInjectionLimit
  });
  for (const c of invisibleCandidates) exclusionIds.add(c.id);

  const remainingAfterInjection = Math.max(0, remainingAfterStrong - invisibleCandidates.length);

  const fillPool = remainingAfterInjection <= 0 ? [] : await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(exclusionIds) },
      cityId: user.cityId,
      accountStatus: 'active',
      isFrozen: false,
      age: { gte: ageRange.min, lte: ageRange.max },
      NOT: { id: { in: Array.from(atCapIds) } }
    },
    include: { profile: true },
    take: 200
  });

  const viewerTier = mpsTier(user.mps);
  const viewerTierIndex = TIER_INDEX[viewerTier];
  const affinityScore = (candidate: Candidate): number => 1 - Math.abs(candidate.mps - user.mps) / 8;

  const sameTier = fillPool
    .filter((c) => TIER_INDEX[mpsTier(c.mps)] === viewerTierIndex)
    .sort((a, b) => affinityScore(b) - affinityScore(a));
  const higherTier = fillPool
    .filter((c) => TIER_INDEX[mpsTier(c.mps)] > viewerTierIndex)
    .sort((a, b) => affinityScore(b) - affinityScore(a));
  const lowerTier = fillPool
    .filter((c) => TIER_INDEX[mpsTier(c.mps)] < viewerTierIndex)
    .sort((a, b) => affinityScore(b) - affinityScore(a));

  const desiredSame = Math.floor(remainingAfterInjection * 0.6);
  const desiredHigher = Math.floor(remainingAfterInjection * 0.2);
  const desiredLower = remainingAfterInjection - desiredSame - desiredHigher;

  const pick = (arr: Candidate[], count: number) => arr.slice(0, Math.max(0, count));
  const tierFillInitial = [
    ...pick(sameTier, desiredSame),
    ...pick(higherTier, desiredHigher),
    ...pick(lowerTier, desiredLower)
  ];

  const needMore = remainingAfterInjection - tierFillInitial.length;
  const tierFill = needMore > 0
    ? [...tierFillInitial, ...fillPool.filter((c) => !tierFillInitial.some((t) => t.id === c.id)).slice(0, needMore)]
    : tierFillInitial;

  const byId = new Set<string>();
  const candidates = [...strongCandidates, ...invisibleCandidates, ...tierFill].filter((c) => {
    if (byId.has(c.id)) return false;
    byId.add(c.id);
    return true;
  }).slice(0, remainingSlots);
  const pendingCounts = candidates.length > 0
    ? await prisma.like.groupBy({
        by: ['toUserId'],
        where: { toUserId: { in: candidates.map((c) => c.id) }, status: 'pending', expiresAt: { gt: new Date() } },
        _count: { _all: true }
      })
    : [];
  const pendingCountByUserId = new Map<string, number>(pendingCounts.map((g) => [g.toUserId, g._count._all]));
  const matchProbabilityByUserId = new Map<string, number>(
    await Promise.all(
      candidates.map(async (candidate) => [candidate.id, await matchProbability(user.id, candidate.id)] as const)
    )
  );

  if (quota && candidates.length > 0) {
    await prisma.$transaction([
      prisma.dailyQuota.update({
        where: { userId: user.id },
        data: {
          profilesShownToday: { increment: candidates.length },
          shownUserIdsJson: JSON.stringify([...shownUserIds, ...candidates.map((c) => c.id)])
        }
      }),
      prisma.user.updateMany({
        where: { id: { in: candidates.map((c) => c.id) } },
        data: { impressionsCount: { increment: 1 }, impressions_count: { increment: 1 } }
      })
    ]);
  }

  const shownCount = (quota?.profilesShownToday ?? 0) + candidates.length;
  const limitReached = shownCount >= DAILY_PROFILE_LIMIT;

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">Discovery 5x5</h1>
      <p className="card">Shown today: {shownCount}/25 | Likes left: {quota?.likesRemaining ?? 0}/5</p>
      {limitReached ? <p className="card">Daily profile limit reached. Come back after local midnight.</p> : null}
      <div className="grid grid-cols-5 gap-1">
        {candidates.slice(0, 25).map((p) => {
          const queueCount = pendingCountByUserId.get(p.id) ?? 0;
          const warning = p.mps - user.mps > 2.5 || queueCount > 50
            ? 'Based on current demand and your Market Placement, you may be positioned lower in this queue. To move up, complete Roadmap Tasks to optimize resonance or maintain high Reliability.'
            : null;
          const matchProbability = matchProbabilityByUserId.get(p.id) ?? 0;
          return (
            <div key={p.id} className="card p-2 text-[10px]">
              <img src={p.profile?.photoMainUrl} alt="profile" className="h-12 w-full rounded object-cover" />
              <p>MPS: {displayMpsOrCalibrating(p.mps, p.impressions_count)}</p>
              <p>Reliability: {Math.round(p.reliability * 100)}%</p>
              {user.isPremium ? <p>Match Chance: {matchProbability}%</p> : null}
              {warning ? <p className="text-amber-300">{warning}</p> : null}
              {p.profile?.verificationStatus === 'passed' ? <p className="text-sky-300">Blue Tint badge</p> : null}
              <form action="/api/like" method="post">
                <input type="hidden" name="toUserId" value={p.id} />
                <input type="hidden" name="type" value="strong" />
                <button className="underline">Strong Like</button>
              </form>
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
              <form action="/api/pass" method="post">
                <input type="hidden" name="targetUserId" value={p.id} />
                <button className="underline">Pass</button>
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
