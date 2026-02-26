'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { StrongLikeAction } from '@/components/StrongLikeAction';

type DiscoveryProfile = {
  id: string;
  firstName: string;
  age: number;
  city: string;
  tierLabel: string;
  photoUrls: string[];
  bio: string;
  prompts: string[];
  snippet: string;
  warning: string | null;
  strongProbability: number;
};

type Props = {
  profiles: DiscoveryProfile[];
  isPremium: boolean;
  isAdmin: boolean;
  initialLikesRemaining: number;
  shownCount: number;
  profileDailyLimit: number;
  likeDailyLimit: number;
  limitReached: boolean;
};

const twoLineClampStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.8 8.6c0 4.6-4.7 7.9-8.8 11.2C7.9 16.5 3.2 13.2 3.2 8.6A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.6Z" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="m12 2.6 2.9 5.9 6.5 1-4.7 4.6 1.1 6.5L12 17.6l-5.8 3 1.1-6.5L2.6 9.5l6.5-1L12 2.6Z" />
    </svg>
  );
}

function IconInvisible() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
      <path d="M9.1 5.3A11.5 11.5 0 0 1 12 5c5.5 0 9.4 4 10.7 7-0.4 0.8-1.1 2-2.2 3.2" />
      <path d="M6 8.2C4.6 9.5 3.7 11 3.3 12 4.6 15 8.5 19 14 19c1.1 0 2.1-0.2 3-0.5" />
    </svg>
  );
}

function ActionRow({
  profileId,
  warning,
  strongProbability,
  likesExhausted,
  disabledReason,
  onLikeSubmit
}: {
  profileId: string;
  warning: string | null;
  strongProbability: number;
  likesExhausted: boolean;
  disabledReason: string;
  onLikeSubmit: () => boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <form action="/api/like" method="post" onSubmit={(e) => { if (!onLikeSubmit()) e.preventDefault(); }}>
        <input type="hidden" name="toUserId" value={profileId} />
        <input type="hidden" name="type" value="direct" />
        <button
          type="submit"
          disabled={likesExhausted}
          title={likesExhausted ? disabledReason : 'Send a direct like'}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-rose-300/40 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <IconHeart />
          Direct
        </button>
      </form>
      <StrongLikeAction
        targetUserId={profileId}
        shouldWarn={!!warning}
        probability={strongProbability}
        warningMessage="Based on current demand and your Market Placement, you may be positioned lower in this queue. Consider optimizing your profile or targeting closer market peers for faster results."
        disabled={likesExhausted}
        disabledReason={disabledReason}
        onBeforeSubmit={onLikeSubmit}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-amber-300/50 bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <IconStar />
        Strong
      </StrongLikeAction>
      <form action="/api/like" method="post" onSubmit={(e) => { if (!onLikeSubmit()) e.preventDefault(); }}>
        <input type="hidden" name="toUserId" value={profileId} />
        <input type="hidden" name="type" value="invisible" />
        <button
          type="submit"
          disabled={likesExhausted}
          title={likesExhausted ? disabledReason : 'Send an invisible like'}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-sky-300/40 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <IconInvisible />
          Invisible
        </button>
      </form>
      <form action="/api/pass" method="post">
        <input type="hidden" name="targetUserId" value={profileId} />
        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-md border border-zinc-500/50 bg-zinc-700/40 px-3 py-2 text-xs font-semibold text-zinc-200"
        >
          Pass (Hide)
        </button>
      </form>
    </div>
  );
}

export function DiscoveryFeed({
  profiles,
  isPremium,
  isAdmin,
  initialLikesRemaining,
  shownCount,
  profileDailyLimit,
  likeDailyLimit,
  limitReached
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [likesRemaining, setLikesRemaining] = useState<number>(initialLikesRemaining);
  const [showLikeCapHint, setShowLikeCapHint] = useState(false);

  const openProfile = useMemo(
    () => profiles.find((p) => p.id === openProfileId) ?? null,
    [profiles, openProfileId]
  );

  const likesExhausted = !isAdmin && likesRemaining <= 0;
  const profileRemaining = Math.max(0, profileDailyLimit - shownCount);
  const likeCounterText = isAdmin ? 'Unlimited likes' : `${likesRemaining} likes remaining`;
  const disabledReason = `Daily like limit reached (${likeDailyLimit}/${likeDailyLimit}).`;

  const consumeLike = () => {
    if (isAdmin) return true;
    if (likesRemaining <= 0) {
      setShowLikeCapHint(true);
      return false;
    }
    setLikesRemaining((current) => Math.max(0, current - 1));
    setShowLikeCapHint(false);
    return true;
  };

  return (
    <div className="space-y-3">
      <header className="card space-y-1 p-3">
        <h1 className="text-lg font-semibold">Discovery</h1>
        <p className="text-xs text-zinc-400">{profileRemaining} remaining today</p>
        <p className="text-xs text-zinc-400">{likeCounterText}</p>
        {likesExhausted ? <p className="text-xs text-amber-300">{disabledReason}</p> : null}
      </header>

      {limitReached ? <p className="card text-sm">Daily profile limit reached. Come back after local midnight.</p> : null}
      {showLikeCapHint ? <p className="card text-xs text-amber-300">{disabledReason}</p> : null}

      <section className="space-y-4">
        {profiles.map((profile) => {
          const expanded = expandedIds.has(profile.id);
          const photoUrl = profile.photoUrls[0] ?? 'https://picsum.photos/seed/discovery/600/800';
          return (
            <article key={profile.id} className="card overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setOpenProfileId(profile.id)}
                className="w-full text-left"
              >
                <img src={photoUrl} alt={`${profile.firstName} profile`} className="aspect-[3/4] w-full object-cover" />
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{profile.firstName}, {profile.age}</p>
                    {isPremium ? (
                      <span className="rounded-full border border-zinc-500 px-2 py-0.5 text-[10px] text-zinc-200">{profile.tierLabel}</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-400">{profile.city}</p>
                  <p className="text-xs text-zinc-200" style={expanded ? undefined : twoLineClampStyle}>{profile.snippet}</p>
                </div>
              </button>

              <div className="space-y-2 p-3 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(expandedIds);
                    if (next.has(profile.id)) next.delete(profile.id);
                    else next.add(profile.id);
                    setExpandedIds(next);
                  }}
                  className="text-xs text-zinc-300 underline"
                >
                  {expanded ? 'Collapse' : 'Expand'}
                </button>
                <ActionRow
                  profileId={profile.id}
                  warning={profile.warning}
                  strongProbability={profile.strongProbability}
                  likesExhausted={likesExhausted}
                  disabledReason={disabledReason}
                  onLikeSubmit={consumeLike}
                />
              </div>
            </article>
          );
        })}
      </section>

      {openProfile ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:p-4">
          <div className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-xl border border-zinc-600 bg-zinc-900 p-4 sm:rounded-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">{openProfile.firstName}, {openProfile.age}</p>
              <button type="button" className="text-sm underline" onClick={() => setOpenProfileId(null)}>Close</button>
            </div>
            <div className="space-y-2">
              {openProfile.photoUrls.map((url, idx) => (
                <img key={`${openProfile.id}-${idx}`} src={url} alt={`${openProfile.firstName} photo ${idx + 1}`} className="aspect-[3/4] w-full rounded object-cover" />
              ))}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-zinc-300">{openProfile.city}</p>
              {isPremium ? <p className="text-zinc-300">Tier: {openProfile.tierLabel}</p> : null}
              {openProfile.bio ? <p>{openProfile.bio}</p> : <p className="text-zinc-400">No bio provided yet.</p>}
              {openProfile.prompts.length > 0 ? (
                <div className="space-y-1">
                  {openProfile.prompts.map((prompt, idx) => (
                    <p key={`${openProfile.id}-prompt-${idx}`} className="rounded-md border border-zinc-700 bg-zinc-800/60 p-2 text-xs">{prompt}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <ActionRow
                profileId={openProfile.id}
                warning={openProfile.warning}
                strongProbability={openProfile.strongProbability}
                likesExhausted={likesExhausted}
                disabledReason={disabledReason}
                onLikeSubmit={consumeLike}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
