import { getSessionUser } from '@/lib/session-user';

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user?.profile) return <p>No profile.</p>;
  return (
    <main className="space-y-3">
      <h1 className="text-xl">Profile</h1>
      <p className="card">Profile scoring now uses behavioral market signals only.</p>
      <p className="card">New accounts begin at MPS 5.0 and build reliability through interactions.</p>
      <img src={user.profile.photoMainUrl} alt="main" className="card h-56 w-full object-cover" />
      <p className="card">Photo captured at: {user.profile.photoCapturedAt.toISOString()} (camera-required architecture ready; upload simulated now)</p>
      <p className="card">Contact email: {user.contactEmail || 'Not set'}</p>
      <p className="card">Contact phone: {user.contactPhone || 'Not set'}</p>
    </main>
  );
}
