import { getSessionUser } from '@/lib/session-user';
import { prisma } from '@/lib/prisma';
import { pairKey } from '@/lib/pairs';
import { UNFREEZE_RESPONSE_WINDOW_MS } from '@/lib/freeze';

function displayName(email: string): string {
  const local = email.split('@')[0] ?? '';
  const token = local.split(/[._-]/)[0] ?? local;
  if (!token) return 'Partner';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function countdownLabel(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return '0h 0m';
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function pendingUnfreezeRequest(conversation: {
  participantAId: string;
  participantBId: string;
  contactShareProposedAt: Date | null;
  contactShareAcceptedByUserA: boolean;
  contactShareAcceptedByUserB: boolean;
}) {
  if (!conversation.contactShareProposedAt) return null;
  const initiatorId = conversation.contactShareAcceptedByUserA && !conversation.contactShareAcceptedByUserB
    ? conversation.participantAId
    : conversation.contactShareAcceptedByUserB && !conversation.contactShareAcceptedByUserA
      ? conversation.participantBId
      : null;
  if (!initiatorId) return null;
  const expiresAt = new Date(conversation.contactShareProposedAt.getTime() + UNFREEZE_RESPONSE_WINDOW_MS);
  return { initiatorId, expiresAt };
}

export default async function FreezePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const user = await getSessionUser();
  if (!user) return <p>No user.</p>;
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    include: { partner: true }
  });
  if (!current) return <p>No user.</p>;
  const frozenConvo = current.partnerId
    ? await prisma.conversation.findUnique({ where: { pairKey: pairKey(current.id, current.partnerId) } })
    : null;

  const statusRaw = searchParams?.status;
  const status = Array.isArray(statusRaw) ? statusRaw[0] : (statusRaw ?? '');
  const statusMessage = status === 'dissolved'
    ? 'Freeze ended. Match removed and your slot is now open.'
    : status === 'requested'
      ? 'Unfreeze request sent. Your partner has 48 hours to respond.'
      : status === 'kept'
        ? 'Unfreeze request dismissed. Freeze remains active.'
        : status === 'request-already-open'
          ? 'An unfreeze request is already active.'
          : status === 'frozen'
            ? 'Freeze confirmed.'
            : '';

  const request = frozenConvo ? pendingUnfreezeRequest(frozenConvo) : null;
  const hasRequest = !!request;
  const initiatedByMe = request?.initiatorId === current.id;
  const initiatorName = request?.initiatorId === current.id
    ? 'You'
    : current.partner
      ? displayName(current.partner.email)
      : 'Your partner';

  return (
    <main className="space-y-3">
      <h1 className="text-xl">Freeze Relationship</h1>
      {statusMessage ? <p className="card text-sm">{statusMessage}</p> : null}
      {!current.isFrozen ? (
        <>
          <p className="card">No active freeze. If a freeze recently ended, your match slot is open and discovery is available immediately.</p>
          <form action="/api/freeze" method="post" className="space-y-2">
            <input className="card w-full" name="partnerId" placeholder="partner user id" />
            <button className="card w-full">Confirm Freeze</button>
          </form>
        </>
      ) : (
        <>
          <p className="card">You are frozen with {current.partner ? displayName(current.partner.email) : 'your partner'}.</p>
          {!hasRequest ? (
            <>
              <p className="card">Freeze is active with no timer. It stays until either person requests unfreeze.</p>
              <form action="/api/freeze" method="post">
                <input type="hidden" name="action" value="request_unfreeze" />
                <button className="card w-full">Request Unfreeze</button>
              </form>
            </>
          ) : (
            <>
              <p className="card">Unfreeze requested by {initiatorName}. Time remaining: {countdownLabel(request!.expiresAt)}.</p>
              {!initiatedByMe ? (
                <div className="grid grid-cols-2 gap-2">
                  <form action="/api/freeze" method="post">
                    <input type="hidden" name="action" value="confirm_unfreeze" />
                    <button className="card w-full">Confirm Unfreeze</button>
                  </form>
                  <form action="/api/freeze" method="post">
                    <input type="hidden" name="action" value="keep_frozen" />
                    <button className="card w-full">Keep Frozen</button>
                  </form>
                </div>
              ) : (
                <p className="card">Waiting for your partner response. If they do not respond, freeze auto-dissolves at expiry.</p>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
