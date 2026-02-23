import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session-user';
import { Nav } from '@/components/Nav';
import { runExpireConversations } from '@/lib/conversation-expiry';

export default async function ConversationsPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;
  await runExpireConversations();
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ participantAId: user.id }, { participantBId: user.id }],
      state: { in: ['active', 'gated_to_video'] },
      endedAt: null
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
          <p>Messages (total): {c.messageCountTotal}</p>
          <p>You can send up to 15 each.</p>
          <p>State: {c.state}</p>
          <p>Expires in ~{Math.max(0, Math.ceil((72 * 3600 * 1000 - (Date.now() - (c.lastMessageAt ?? c.createdAt).getTime())) / (3600 * 1000)))}h inactivity</p>
        </Link>
      ))}
    </main>
  );
}
