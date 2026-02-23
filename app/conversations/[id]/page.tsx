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
  const gated = convo.state === 'gated_to_video' || senderCount >= MESSAGE_CAP || otherCount >= MESSAGE_CAP;
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

  return (
    <main className="space-y-3">
      <h1 className="text-xl">Conversation</h1>
      <div className="card">
        <p>Your messages: {senderCount}/15</p>
        <p>Their messages: {otherCount}/15</p>
        <p>State: {convo.state}</p>
        <p>Expires in ~{remainingHours}h without new messages.</p>
        {gated ? (
          <div className="mt-2 space-y-2">
            <form action="/api/video-date/propose" method="post">
              <input type="hidden" name="conversationId" value={convo.id} />
              <button className="card w-full">Schedule Video Date (20 min)</button>
            </form>
            <form action="/api/contact/propose" method="post">
              <input type="hidden" name="conversationId" value={convo.id} />
              <button className="card w-full">Share Contact Info</button>
            </form>
          </div>
        ) : null}
        {convo.videoDateStatus !== 'none' ? (
          <div className="mt-2 space-y-2">
            <p>Video date status: {convo.videoDateStatus}</p>
            {convo.videoDateStatus === 'proposed' || convo.videoDateStatus === 'none' ? (
              <form action="/api/video-date/schedule" method="post" className="space-y-2">
                <input type="hidden" name="conversationId" value={convo.id} />
                <input className="card w-full" type="datetime-local" name="startAt" />
                <input className="card w-full" type="datetime-local" name="endAt" />
                <button className="card w-full">Confirm 20-min window</button>
              </form>
            ) : null}
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
    </main>
  );
}
