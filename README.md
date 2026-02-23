# Politically Incorrect Dating App (MVP)

Local-only Next.js + Prisma MVP implementing the specified state machines, hard caps, and roadmap/waitlist behavior.

## Stack
- Next.js App Router + TypeScript + Tailwind
- NextAuth credentials login
- Prisma + SQLite (portable schema for Postgres migration later)

## Setup
1. `cp .env.example .env`
2. `npm install`
3. `npx prisma migrate dev --name init`
4. `npm run prisma:seed`
5. `npm run dev`

## Env Vars
- `DATABASE_URL` SQLite local db (portable models).
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `SIGNUP_FEE_PLACEHOLDER` UI text only.

## Implemented Rules
- Discovery: max 25 profiles/day displayed in 5x5 grid UI and max 5 likes/day.
- Discovery shown tracking: stores `DailyQuota.shownUserIdsJson`, increments `profilesShownToday`, and avoids repeated profile cards in the same day.
- Conversations: max 5 active chats per user and 15 total-message cap with gated "Schedule 20-min Video Date" CTA (stub).
- Active conversation cap is enforced for both users before conversation creation.
- Unmatch endpoint: `POST /api/unmatch` sets `conversation.state=ended`, immediately freeing an active slot.
- Likes expire strictly by `expiresAt` + cron/script.
- Freeze flow sets `isFrozen` and `partnerId`; frozen users removed from discovery and blocked from like/message APIs.
- Waitlist city lock if city active users < 1000 with progress + roadmap.
- Active user definition: account is `active`, not frozen, and `lastActiveAt` within the last 30 days.
- City status is computed from active users and refreshed on waitlist/discovery reads and in seed flow.
- MPS weighted scoring, tiers, roadmap next-best actions, and history log.
- Peer review loop requires anonymous photo-only 1-10 ratings, stores raw + normalized + weighted scores.
- Peer-review normalization assumption: rater mean-centering (`raw - rater_mean`) clamped to [-3, +3].
- Odds bubble uses real per-profile daily likes (`ProfileDailyStat.likesReceived`) + MPS tier gap.
- Ban state: `accountStatus` with login blocked for `banned`.

## Cron-like local jobs
- `npm run cron:daily` -> resets likes remaining, shown profiles, shown ID list, and peer-review gate counters.
- `npm run cron:expire-likes` -> expires pending likes where `expiresAt <= now`.
- `npm run cron:reliability` -> recalculates reliability and MPS from completion/activity.

API wrappers call these directly (no shelling out):
- `POST /api/cron/daily-reset`
- `POST /api/cron/expire-likes`

## Extension points
- Blue Tint background verification: `profiles.verificationStatus` is badge-only in discovery (not ranking boost).
- Future vendor hooks: background checks + risk fingerprint matching placeholders exist in schema.
- Video integration: conversation state machine already gates at 15 messages and exposes schedule CTA stub.
- Camera capture requirement: schema stores `photoCapturedAt`; upload used for MVP while preserving capture architecture.

## Assumptions
- Server pages and APIs use authenticated session user (`getServerSession`) as the acting user.
- Opposite-sex peer review uses male/female pairing only for this MVP gate.

## Testing
- `npm test` validates key state machine logic (like expiry + 15-message gate).
