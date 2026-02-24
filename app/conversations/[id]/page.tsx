import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session-user';
import { MESSAGE_CAP } from '@/lib/domain';
import { runExpireConversations } from '@/lib/conversation-expiry';

export default async function ConversationDetail({ params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return <p>Unauthorized.</p>;
  await runExpireConversations();
  const convo = await prisma.conversation.findUnique({ where: { id: params.id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
  if (!convo) return <p>Conversation not found.</p>;
  if (convo.participantAId !== userId && convo.participantBId !== userId) return <p>Forbidden.</p>;
  const senderCount = convo.participantAId === userId ? convo.messageCountByA : convo.messageCountByB;
  const otherCount = convo.participantAId === userId ? convo.messageCountByB : convo.messageCountByA;
  const gated = convo.state === 'gated_to_video' || convo.messageCountTotal >= MESSAGE_CAP;
  const ended = convo.state === 'ended' || !!convo.endedAt;
  const textDisabled = gated || ended;
  const baseline = convo.lastMessageAt ?? convo.createdAt;
  const remainingHours = Math.max(0, Math.ceil((72 * 3600 * 1000 - (Date.now() - baseline.getTime())) / (3600 * 1000)));
  const contactAcceptedByMe = convo.participantAId === userId ? convo.contactShareAcceptedByUserA : convo.contactShareAcceptedByUserB;
  const contactAcceptedByOther = convo.participantAId === userId ? convo.contactShareAcceptedByUserB : convo.contactShareAcceptedByUserA;
  const otherUserId = convo.participantAId === userId ? convo.participantBId : convo.participantAId;
  const otherUser = convo.contactInfoSharedAt
    ? await prisma.user.findUnique({ where: { id: otherUserId }, select: { contactEmail: true, contactPhone: true } })
    : null;
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + 7);
  const minDateStr = minDate.toISOString().slice(0, 10);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  return (
    <main className="space-y-3">
      <h1 className="text-xl">Conversation</h1>
      <div className="card">
        <p>Your messages: {senderCount}/15</p>
        <p>Their messages: {otherCount}/15</p>
        <p>Total messages: {convo.messageCountTotal}/15</p>
        <p>State: {convo.state}</p>
        <p>Expires in ~{remainingHours}h without new messages.</p>
        {convo.videoDateStatus !== 'none' ? (
          <div className="mt-2 space-y-2">
            <p>Video date status: {convo.videoDateStatus}</p>
            {convo.videoDateStatus === 'scheduled' ? (
              <form action="/api/video-date/complete" method="post">
                <input type="hidden" name="conversationId" value={convo.id} />
                <button className="card w-full">Mark Video Date Completed</button>
              </form>
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 space-y-2">
          <p>Contact share status: {convo.contactInfoSharedAt ? 'shared' : contactAcceptedByMe ? 'waiting for other user' : 'not accepted yet'}</p>
          {!convo.contactInfoSharedAt ? (
            <form action="/api/contact/accept" method="post">
              <input type="hidden" name="conversationId" value={convo.id} />
              <button className="card w-full">{contactAcceptedByMe ? 'Accepted (waiting)' : 'Accept Contact Share'}</button>
            </form>
          ) : null}
          {convo.contactInfoSharedAt ? (
            <div className="card">
              <p>Contact unlocked by mutual consent.</p>
              <p>Email: {otherUser?.contactEmail || 'Not provided'}</p>
              <p>Phone: {otherUser?.contactPhone || 'Not provided'}</p>
            </div>
          ) : null}
          {!contactAcceptedByMe && contactAcceptedByOther ? <p className="text-xs">Other user accepted. Your acceptance will unlock contact details.</p> : null}
        </div>
      </div>
      {convo.messages.map((m) => <p className="card" key={m.id}>{m.body}</p>)}
      <form action="/api/message" method="post" className="space-y-2">
        <input type="hidden" name="conversationId" value={convo.id} />
        <input className="card w-full" name="body" placeholder={textDisabled ? 'Messaging is disabled for this conversation.' : 'Type message'} disabled={textDisabled} />
        <button className="card w-full" disabled={textDisabled}>Send</button>
      </form>
      <form action="/api/unmatch" method="post">
        <input type="hidden" name="conversationId" value={convo.id} />
        <button className="card w-full">Unmatch / End conversation</button>
      </form>
      {gated && !ended ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-3 rounded border border-zinc-700 bg-zinc-900 p-4">
            <h2 className="text-lg font-semibold">Choose Your Path</h2>
            <p className="text-sm">Chat is now capped at 15 total messages. Choose video or contact sharing.</p>
            <form action="/api/video-date/schedule" method="post" className="space-y-2">
              <input type="hidden" name="conversationId" value={convo.id} />
              <label className="text-sm">Pick a date (next 7 days)</label>
              <input className="card w-full" type="date" name="scheduledDate" min={minDateStr} max={maxDateStr} required />
              <button className="card w-full">Propose 20-Min Video</button>
            </form>
            <form action="/api/contact/propose" method="post" className="space-y-2">
              <input type="hidden" name="conversationId" value={convo.id} />
              <button className="card w-full">Exchange Contacts</button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
