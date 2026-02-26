'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { RoadmapAdviceBucket, RoadmapCategory } from '@/lib/roadmap-advice';

type Props = {
  userId: string;
  isPremium: boolean;
  cards: RoadmapAdviceBucket[];
};

const CATEGORY_ORDER: RoadmapCategory[] = ['physicality', 'resources', 'safety', 'reliability'];

const CATEGORY_STYLE: Record<RoadmapCategory, { label: string; border: string; dot: string; bg: string }> = {
  physicality: { label: 'Physicality', border: 'border-orange-400/70', dot: 'bg-orange-400', bg: 'bg-orange-500/5' },
  resources: { label: 'Resources', border: 'border-sky-400/70', dot: 'bg-sky-400', bg: 'bg-sky-500/5' },
  safety: { label: 'Safety', border: 'border-emerald-400/70', dot: 'bg-emerald-400', bg: 'bg-emerald-500/5' },
  reliability: { label: 'Reliability', border: 'border-violet-400/70', dot: 'bg-violet-400', bg: 'bg-violet-500/5' }
};

function doneStorageKey(userId: string): string {
  return `roadmap_done_${userId}`;
}

export function RoadmapAdviceCards({ userId, isPremium, cards }: Props) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(doneStorageKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setDoneIds(new Set(parsed.filter((v): v is string => typeof v === 'string')));
    } catch {
      // Ignore malformed local storage and keep UI functional.
    }
  }, [userId]);

  const grouped = useMemo(() => {
    const source = isPremium ? cards : cards.slice(0, 2);
    return CATEGORY_ORDER.map((category) => ({
      category,
      cards: source.filter((card) => card.category === category)
    })).filter((entry) => entry.cards.length > 0);
  }, [cards, isPremium]);

  const toggleDone = (bucketId: string) => {
    const next = new Set(doneIds);
    if (next.has(bucketId)) next.delete(bucketId);
    else next.add(bucketId);
    setDoneIds(next);
    localStorage.setItem(doneStorageKey(userId), JSON.stringify(Array.from(next)));
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">AI Roadmap</h2>
      <div className="relative space-y-4">
        {!isPremium ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="card pointer-events-auto max-w-sm space-y-2 p-4 text-center">
              <p className="text-sm">Unlock your full Roadmap to see all your personalized improvements.</p>
              <Link href="/pricing" className="card inline-block px-3 py-2 text-sm font-semibold">Get Full Access</Link>
            </div>
          </div>
        ) : null}

        <div className={`space-y-4 ${isPremium ? '' : 'blur-sm'}`}>
          {grouped.map((group) => {
            const style = CATEGORY_STYLE[group.category];
            return (
              <div key={group.category} className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  {style.label}
                </p>
                <div className="space-y-2">
                  {group.cards.map((card) => {
                    const done = doneIds.has(card.id);
                    return (
                      <article key={card.id} className={`card border-l-4 ${style.border} ${style.bg} space-y-2 p-3`}>
                        <h3 className="text-sm font-semibold">{card.title}</h3>
                        <p className="text-sm text-zinc-200">{card.body}</p>
                        {isPremium ? (
                          <button
                            type="button"
                            onClick={() => toggleDone(card.id)}
                            className="text-xs underline text-zinc-300"
                          >
                            {done ? 'Marked done' : 'Mark as done'}
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
