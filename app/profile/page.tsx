import { getDemoUser } from '@/lib/current-user';

export default async function ProfilePage() {
  const user = await getDemoUser();
  if (!user?.profile) return <p>No profile.</p>;
  return (
    <main className="space-y-3">
      <h1 className="text-xl">Profile</h1>
      <p className="card">Height is collected but excluded from MPS ranking.</p>
      <p className="card">Unchangeable traits are explicitly excluded from MPS calculations.</p>
      <img src={user.profile.photoMainUrl} alt="main" className="card h-56 w-full object-cover" />
      <p className="card">Photo captured at: {user.profile.photoCapturedAt.toISOString()} (camera-required architecture ready; upload simulated now)</p>
    </main>
  );
}
