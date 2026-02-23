import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session-user';
import { Nav } from '@/components/Nav';

export default async function ConversationsPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ participantAId: user.id }, { participantBId: user.id }],
      state: { in: ['active', 'gated_to_video'] }
    },
    take: 5
  });

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">Conversations ({conversations.length}/5 active)</h1>
      {conversations.map((c) => (
        <Link key={c.id} href={`/conversations/${c.id}`} className="card block">
          <p>ID: {c.id.slice(0, 8)}</p>
          <p>Messages: {c.messageCountTotal}/15</p>
          <p>State: {c.state}</p>
        </Link>
      ))}
    </main>
  );
}
