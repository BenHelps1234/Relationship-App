import { prisma } from '@/lib/prisma';
import { classifyProfile } from '@/lib/roadmap-classifier';
import { ROADMAP_ADVICE_BUCKETS, ROADMAP_ADVICE_BY_ID, type RoadmapAdviceBucket, type RoadmapCategory } from '@/lib/roadmap-advice';
import { RoadmapAdviceCards } from '@/components/RoadmapAdviceCards';

type Props = {
  user: {
    id: string;
    gender: 'male' | 'female' | 'non_binary';
    age: number;
    mps: number;
    reliabilityScore: number;
    isPremium: boolean;
    updatedAt: Date;
    profile?: {
      bio: string | null;
      prompts: string | null;
      photoMainUrl: string;
    } | null;
  };
};

const CLASSIFIER_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ADVICE_CARDS = 6;
const CATEGORY_ORDER: RoadmapCategory[] = ['physicality', 'resources', 'safety', 'reliability'];

function safeParseBucketIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function parsePrompts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    // Fall through to newline parser.
  }
  return trimmed.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
}

function fallbackCardsForGender(gender: 'male' | 'female'): RoadmapAdviceBucket[] {
  const fallbackIds = [
    `physicality_${gender}_photos`,
    `reliability_${gender}_completion`,
    `safety_${gender}_kindness`,
    `resources_${gender}_ambition`,
    `safety_${gender}_consistency`,
    `reliability_${gender}_followthrough`
  ];
  return fallbackIds
    .map((id) => ROADMAP_ADVICE_BY_ID.get(id))
    .filter((bucket): bucket is RoadmapAdviceBucket => !!bucket)
    .slice(0, MAX_ADVICE_CARDS);
}

function sortAndMapCards(ids: string[]): RoadmapAdviceBucket[] {
  const uniqueIds = Array.from(new Set(ids));
  const mapped = uniqueIds
    .map((id) => ROADMAP_ADVICE_BY_ID.get(id))
    .filter((bucket): bucket is RoadmapAdviceBucket => !!bucket);
  const scored = mapped.map((card, index) => ({
    card,
    index,
    categoryIndex: CATEGORY_ORDER.indexOf(card.category)
  }));
  scored.sort((a, b) => {
    if (a.categoryIndex !== b.categoryIndex) return a.categoryIndex - b.categoryIndex;
    return a.index - b.index;
  });
  return scored.map((entry) => entry.card).slice(0, MAX_ADVICE_CARDS);
}

async function getRoadmapCache(userId: string): Promise<{ ids: string[]; generatedAt: Date | null }> {
  const rows = await prisma.$queryRaw<Array<{ roadmapBucketIds: string; roadmapGeneratedAt: Date | null }>>`
    SELECT "roadmapBucketIds", "roadmapGeneratedAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ids: [], generatedAt: null };
  return { ids: safeParseBucketIds(row.roadmapBucketIds), generatedAt: row.roadmapGeneratedAt ?? null };
}

async function persistRoadmapCache(userId: string, bucketIds: string[], generatedAt: Date): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "roadmapBucketIds" = ${JSON.stringify(bucketIds)},
        "roadmapGeneratedAt" = ${generatedAt}
    WHERE "id" = ${userId}
  `;
}

export function RoadmapAdviceSkeleton() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">AI Roadmap</h2>
      <div className="space-y-2">
        <div className="card h-20 animate-pulse bg-zinc-800/70" />
        <div className="card h-20 animate-pulse bg-zinc-800/70" />
      </div>
    </section>
  );
}

export default async function RoadmapAdviceSection({ user }: Props) {
  const gender = user.gender === 'female' ? 'female' : 'male';
  const cache = await getRoadmapCache(user.id);
  const now = new Date();
  const needsGeneration =
    !cache.generatedAt ||
    (now.getTime() - cache.generatedAt.getTime()) > CLASSIFIER_TTL_MS ||
    user.updatedAt.getTime() > cache.generatedAt.getTime();

  let bucketIds = cache.ids;
  if (needsGeneration) {
    bucketIds = await classifyProfile({
      gender,
      bio: user.profile?.bio ?? '',
      prompts: parsePrompts(user.profile?.prompts),
      photoCount: user.profile?.photoMainUrl ? 1 : 0,
      mps: user.mps,
      reliabilityScore: user.reliabilityScore,
      age: user.age
    });
    await persistRoadmapCache(user.id, bucketIds, now);
  }

  const cards = bucketIds.length > 0 ? sortAndMapCards(bucketIds) : fallbackCardsForGender(gender);
  const nonPremiumCards = cards.length > 0
    ? cards.slice(0, 2)
    : ROADMAP_ADVICE_BUCKETS.filter((b) => b.gender === gender).slice(0, 2);

  return (
    <RoadmapAdviceCards
      userId={user.id}
      isPremium={user.isPremium}
      cards={user.isPremium ? cards : nonPremiumCards}
    />
  );
}
