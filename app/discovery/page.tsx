import { prisma } from '@/lib/prisma';
import { DAILY_LIKE_LIMIT, DAILY_PROFILE_LIMIT } from '@/lib/domain';
import { mpsTier } from '@/lib/mps';
import { Nav } from '@/components/Nav';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session-user';
import { effectiveCityThreshold, refreshCityStatus } from '@/lib/city';
import { effectiveAgeRange } from '@/lib/filters';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { activeMatchCount } from '@/lib/match';
import { getMatchProbability, marketRealityWarning } from '@/services/probability';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';

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

function firstNameFromEmail(email: string): string {
  const base = email.split('@')[0] ?? '';
  const token = base.split(/[._-]/)[0] ?? base;
  if (!token) return 'Member';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function parsePrompts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v.length > 0);
    }
  } catch {
    // Fallback to line-based prompts.
  }
  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default async function DiscoveryPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;
  const isAdmin = user.isAdmin;
  const viewerCity = await prisma.city.findUnique({ where: { id: user.cityId }, select: { name: true } });
  const cityName = viewerCity?.name ?? 'Your city';

  await refreshCityStatus(user.cityId);
  const cityStatus = await prisma.cityStatus.findUnique({ where: { cityId: user.cityId } });
  const threshold = effectiveCityThreshold(cityStatus?.threshold ?? 1000);
  if (!isAdmin && (cityStatus?.totalUsersActive ?? 0) < threshold) {
    return <main><Nav /><p className="card">Discovery locked for low-city liquidity. <Link href="/waitlist" className="underline">Go to waitlist.</Link></p></main>;
  }
  const viewerActiveMatches = await activeMatchCount(user.id);
  if (!isAdmin && viewerActiveMatches >= ACTIVE_CONVERSATION_LIMIT) {
    return (
      <main>
        <Nav />
        <p className="card">You are at 5 active matches. Resolve one conversation to return to discovery.</p>
      </main>
    );
  }

  const quota = user.dailyQuota;
  const shownUserIds = isAdmin ? [] : (quota ? JSON.parse(quota.shownUserIdsJson) as string[] : []);
  const hidden = await prisma.hiddenProfile.findMany({ where: { userId: user.id }, select: { hiddenUserId: true } });
  const hiddenUserIds = isAdmin ? [] : hidden.map((h) => h.hiddenUserId);
  const remainingSlots = isAdmin ? DAILY_PROFILE_LIMIT : Math.max(0, DAILY_PROFILE_LIMIT - (quota?.profilesShownToday ?? 0));
  const ageRange = isAdmin ? { min: 18, max: 99 } : effectiveAgeRange(user.age, user.preferredAgeMin, user.preferredAgeMax);

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
  const strongSenderIdsEligible = isAdmin ? strongSenderIds : strongSenderIds.filter((id) => !atCapIds.has(id));

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
  const invisibleSenderIdsEligible = isAdmin ? invisibleSenderIds : invisibleSenderIds.filter((id) => !atCapIds.has(id));

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

  const fillPoolWhere = isAdmin
    ? {
        id: { notIn: Array.from(exclusionIds) },
        cityId: user.cityId,
        accountStatus: 'active' as const,
        isFrozen: false,
        age: { gte: ageRange.min, lte: ageRange.max }
      }
    : {
        id: { notIn: Array.from(exclusionIds) },
        cityId: user.cityId,
        accountStatus: 'active' as const,
        isFrozen: false,
        age: { gte: ageRange.min, lte: ageRange.max },
        NOT: { id: { in: Array.from(atCapIds) } }
      };
  const fillPool = remainingAfterInjection <= 0 ? [] : await prisma.user.findMany({
    where: fillPoolWhere,
    include: { profile: true },
    take: 200
  });

  const viewerTier = mpsTier(user.mps);
  const viewerTierIndex = TIER_INDEX[viewerTier];
  const affinityScore = (candidate: Candidate): number => 1 - Math.abs(candidate.mps - user.mps) / 8;
  const freshWindowStart = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
  const totalImpressions = (candidate: Candidate): number => {
    if (typeof candidate.impressions_count === 'number') return candidate.impressions_count;
    return candidate.impressionsCount;
  };

  const sameTier = fillPool
    .filter((c) => TIER_INDEX[mpsTier(c.mps)] === viewerTierIndex)
    .sort((a, b) => affinityScore(b) - affinityScore(a));
  const higherTier = fillPool
    .filter((c) => TIER_INDEX[mpsTier(c.mps)] > viewerTierIndex)
    .sort((a, b) => affinityScore(b) - affinityScore(a));
  const lowerTier = fillPool
    .filter((c) => TIER_INDEX[mpsTier(c.mps)] < viewerTierIndex)
    .sort((a, b) => affinityScore(b) - affinityScore(a));
  const freshUsers = fillPool
    .filter((c) => c.createdAt >= freshWindowStart || totalImpressions(c) < 50)
    .sort((a, b) => affinityScore(b) - affinityScore(a));
  const wildcardPool = [...fillPool].sort(() => Math.random() - 0.5);

  /*
   * Step 3 Discovery Fill Buckets
   * - Same tier: 50%
   * - Higher tier: 20%
   * - Fresh users: 15% (created within 7 days OR < 50 total impressions)
   * - Wildcards: 10% (random sample from fill pool, any tier)
   * - Lower tier: 5%
   *
   * If a bucket underfills, remaining slots are redistributed proportionally
   * across same-tier and higher-tier candidates (same first, then higher).
   */
  const desiredSame = Math.floor(remainingAfterInjection * 0.5);
  const desiredHigher = Math.floor(remainingAfterInjection * 0.2);
  const desiredFresh = Math.floor(remainingAfterInjection * 0.15);
  const desiredWildcard = Math.floor(remainingAfterInjection * 0.1);
  const desiredLower = Math.floor(remainingAfterInjection * 0.05);

  const selectedIds = new Set<string>();
  const pickUnique = (arr: Candidate[], count: number): Candidate[] => {
    if (count <= 0) return [];
    const picked: Candidate[] = [];
    for (const candidate of arr) {
      if (selectedIds.has(candidate.id)) continue;
      selectedIds.add(candidate.id);
      picked.push(candidate);
      if (picked.length >= count) break;
    }
    return picked;
  };

  const tierFillInitial = [
    ...pickUnique(sameTier, desiredSame),
    ...pickUnique(higherTier, desiredHigher),
    ...pickUnique(freshUsers, desiredFresh),
    ...pickUnique(wildcardPool, desiredWildcard),
    ...pickUnique(lowerTier, desiredLower)
  ];

  const redistributionPattern: Array<'same' | 'higher'> = [
    'same', 'same', 'same', 'same', 'same', 'higher', 'higher'
  ];
  let redistributionIndex = 0;
  let remainingToRedistribute = remainingAfterInjection - tierFillInitial.length;
  const redistributed: Candidate[] = [];
  while (remainingToRedistribute > 0) {
    const preferredBucket = redistributionPattern[redistributionIndex % redistributionPattern.length];
    redistributionIndex += 1;
    const preferredPool = preferredBucket === 'same' ? sameTier : higherTier;
    const fallbackPool = preferredBucket === 'same' ? higherTier : sameTier;
    const nextCandidate = preferredPool.find((c) => !selectedIds.has(c.id))
      ?? fallbackPool.find((c) => !selectedIds.has(c.id));
    if (!nextCandidate) break;
    selectedIds.add(nextCandidate.id);
    redistributed.push(nextCandidate);
    remainingToRedistribute -= 1;
  }

  const remainingFallback = remainingAfterInjection - (tierFillInitial.length + redistributed.length);
  const fallbackFill = remainingFallback > 0 ? pickUnique(fillPool, remainingFallback) : [];
  const tierFill = [...tierFillInitial, ...redistributed, ...fallbackFill];

  const byId = new Set<string>();
  const candidates = [...strongCandidates, ...invisibleCandidates, ...tierFill].filter((c) => {
    if (byId.has(c.id)) return false;
    byId.add(c.id);
    return true;
  }).slice(0, remainingSlots);
  const pendingStrongCounts = candidates.length > 0
    ? await prisma.like.groupBy({
        by: ['toUserId'],
        where: { toUserId: { in: candidates.map((c) => c.id) }, type: 'strong', status: 'pending', expiresAt: { gt: new Date() } },
        _count: { _all: true }
      })
    : [];
  const pendingStrongCountByUserId = new Map<string, number>(pendingStrongCounts.map((g) => [g.toUserId, g._count._all]));
  const strongProbabilityByUserId = new Map<string, number>(
    await Promise.all(
      candidates.map(async (candidate) => [candidate.id, await getMatchProbability(user.id, candidate.id, 'strong')] as const)
    )
  );

  if (!isAdmin && quota && candidates.length > 0) {
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

  const shownCount = isAdmin ? candidates.length : (quota?.profilesShownToday ?? 0) + candidates.length;
  const limitReached = !isAdmin && shownCount >= DAILY_PROFILE_LIMIT;
  const likesRemaining = isAdmin ? DAILY_LIKE_LIMIT : (quota?.likesRemaining ?? 0);
  const profiles = candidates.slice(0, DAILY_PROFILE_LIMIT).map((p) => {
    const pendingStrongLikes = pendingStrongCountByUserId.get(p.id) ?? 0;
    const warning = marketRealityWarning(user.mps, p.mps, pendingStrongLikes);
    const strongProbability = strongProbabilityByUserId.get(p.id) ?? 0;
    const prompts = parsePrompts(p.profile?.prompts);
    const bio = p.profile?.bio?.trim() ?? '';
    const snippetSource = prompts[0] ?? bio;
    return {
      id: p.id,
      firstName: firstNameFromEmail(p.email),
      age: p.age,
      city: cityName,
      tierLabel: mpsTier(p.mps),
      photoUrls: [p.profile?.photoMainUrl ?? 'https://picsum.photos/seed/discovery/600/800'],
      bio,
      prompts,
      snippet: snippetSource || 'No prompt or bio yet.',
      warning,
      strongProbability
    };
  });

  return (
    <main className="mx-auto w-full max-w-[480px] space-y-3 px-2 pb-6 pt-2">
      <Nav />
      <DiscoveryFeed
        profiles={profiles}
        isPremium={user.isPremium}
        isAdmin={isAdmin}
        initialLikesRemaining={likesRemaining}
        shownCount={shownCount}
        profileDailyLimit={DAILY_PROFILE_LIMIT}
        likeDailyLimit={DAILY_LIKE_LIMIT}
        limitReached={limitReached}
      />
    </main>
  );
}
