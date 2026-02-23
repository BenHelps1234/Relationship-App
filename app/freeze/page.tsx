import { getSessionUser } from '@/lib/session-user';

export default async function FreezePage() {
  const user = await getSessionUser();
  if (!user) return <p>No user.</p>;

  return (
    <main className="space-y-3">
      <h1 className="text-xl">Freeze Relationship</h1>
      <p className="card">If both users agree: set is_frozen=true, partner_id linking each other. Frozen accounts are hidden from discovery and cannot like/message others.</p>
      <p className="card">Current frozen status: {String(user.isFrozen)}</p>
      <form action="/api/freeze" method="post" className="space-y-2">
        <input className="card w-full" name="partnerId" placeholder="partner user id" />
        <button className="card w-full">Confirm freeze (stub)</button>
      </form>
      <form action="/api/freeze" method="post" className="space-y-2">
        <input type="hidden" name="action" value="unfreeze" />
        <button className="card w-full">Deliberate unfreeze confirmation (stub)</button>
      </form>
    </main>
  );
}
