import { prisma } from '@/lib/prisma';
import { MESSAGE_CAP } from '@/lib/domain';

export default async function ConversationDetail({ params }: { params: { id: string } }) {
  const convo = await prisma.conversation.findUnique({ where: { id: params.id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
  if (!convo) return <p>Conversation not found.</p>;
  const gated = convo.messageCountTotal >= MESSAGE_CAP || convo.state === 'gated_to_video';

  return (
    <main className="space-y-3">
      <h1 className="text-xl">Conversation</h1>
      <div className="card">
        <p>Message cap: {convo.messageCountTotal}/15</p>
        <p>State: {convo.state}</p>
        {gated ? <button className="mt-2 rounded bg-indigo-600 px-3 py-2">Schedule 20-min Video Date (stub)</button> : null}
      </div>
      {convo.messages.map((m) => <p className="card" key={m.id}>{m.body}</p>)}
      <form action="/api/message" method="post" className="space-y-2">
        <input type="hidden" name="conversationId" value={convo.id} />
        <input className="card w-full" name="body" placeholder={gated ? 'Message disabled at cap.' : 'Type message'} disabled={gated} />
        <button className="card w-full" disabled={gated}>Send</button>
      </form>
    </main>
  );
}
