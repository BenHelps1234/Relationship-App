import { ROADMAP_ADVICE_BUCKETS, ROADMAP_ADVICE_BY_ID, ROADMAP_ADVICE_IDS } from '@/lib/roadmap-advice';

export type ClassifierInput = {
  gender: 'male' | 'female';
  bio: string;
  prompts: string[];
  photoCount: number;
  mps: number;
  reliabilityScore: number;
  age: number;
};

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const SYSTEM_PROMPT = 'You are a dating profile classifier. You return only valid JSON arrays containing bucket IDs from the provided list. You never generate free-form text, explanations, or IDs not in the provided list.';
const MAX_RETURN_IDS = 8;

function getPhotoBucketId(gender: 'male' | 'female'): string {
  return `physicality_${gender}_photos`;
}

function getFallbackIds(gender: 'male' | 'female'): string[] {
  const candidates = [
    getPhotoBucketId(gender),
    `reliability_${gender}_completion`,
    `safety_${gender}_kindness`
  ];
  return candidates.filter((id) => ROADMAP_ADVICE_BY_ID.has(id)).slice(0, 3);
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function enforcePhotoBucketFirst(ids: string[], profile: ClassifierInput, allowedIdSet: Set<string>): string[] {
  if (profile.photoCount >= 3) return ids;
  const photoId = getPhotoBucketId(profile.gender);
  if (!allowedIdSet.has(photoId)) return ids;
  const dedupedWithoutPhoto = ids.filter((id) => id !== photoId);
  return [photoId, ...dedupedWithoutPhoto];
}

function sanitizeIds(ids: string[], allowedIdSet: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!allowedIdSet.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_RETURN_IDS) break;
  }
  return out;
}

function buildPrompt(profile: ClassifierInput, validIds: string[]): string {
  return [
    'Classify this dating profile into advice bucket IDs.',
    '',
    'Valid bucket IDs (these are the only allowed outputs):',
    JSON.stringify(validIds),
    '',
    'User profile:',
    JSON.stringify(
      {
        gender: profile.gender,
        age: profile.age,
        bio: profile.bio,
        prompts: profile.prompts,
        photoCount: profile.photoCount,
        mps: profile.mps,
        reliabilityScore: profile.reliabilityScore
      },
      null,
      2
    ),
    '',
    'Rules:',
    '1) Return only a JSON array of bucket IDs.',
    '2) Return absolutely nothing else: no explanation, no markdown, no comments.',
    '3) IDs must come only from the provided valid list.',
    '4) Return at most 8 IDs ordered by priority (highest impact first).',
    '5) If photoCount is less than 3, include the relevant photo bucket as the first item.'
  ].join('\n');
}

export async function classifyProfile(profile: ClassifierInput): Promise<string[]> {
  const fallbackIds = getFallbackIds(profile.gender);
  const allowedIds = ROADMAP_ADVICE_IDS.filter((id) => {
    const bucket = ROADMAP_ADVICE_BY_ID.get(id);
    return !!bucket && (bucket.gender === profile.gender || bucket.gender === 'both');
  });
  const allowedIdSet = new Set<string>(allowedIds);

  if (allowedIds.length === 0) return fallbackIds;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[roadmap-classifier] Missing ANTHROPIC_API_KEY.');
      return fallbackIds;
    }

    const prompt = buildPrompt(profile, allowedIds);
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[roadmap-classifier] Anthropic request failed (${response.status}): ${errText}`);
      return fallbackIds;
    }

    const payload = (await response.json()) as AnthropicResponse;
    const rawText = (payload.content ?? [])
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text ?? '')
      .join('\n')
      .trim();

    if (!rawText) return fallbackIds;

    const cleaned = stripCodeFences(rawText);
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return fallbackIds;

    const rawIds = parsed.filter((item): item is string => typeof item === 'string');
    let validated = sanitizeIds(rawIds, allowedIdSet);
    validated = enforcePhotoBucketFirst(validated, profile, allowedIdSet);
    validated = sanitizeIds(validated, allowedIdSet);

    if (validated.length === 0) return fallbackIds;
    return validated;
  } catch (error) {
    console.error('[roadmap-classifier] classifyProfile failed:', error);
    return fallbackIds;
  }
}

// Keep this import referenced so CI catches accidental catalog removal.
void ROADMAP_ADVICE_BUCKETS;
