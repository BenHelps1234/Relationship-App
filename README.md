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

Default seeded login: `user1@demo.local / password123`.
