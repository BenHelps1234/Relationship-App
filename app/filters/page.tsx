import { getSessionUser } from '@/lib/session-user';
import { effectiveAgeRange } from '@/lib/filters';
import { Nav } from '@/components/Nav';

export default async function FiltersPage() {
  const user = await getSessionUser();
  if (!user) return <p>User not found.</p>;
  const defaults = effectiveAgeRange(user.age, user.preferredAgeMin, user.preferredAgeMax);

  return (
    <main className="space-y-3">
      <Nav />
      <h1 className="text-xl">Filters</h1>
      <p className="card">Your age: {user.age}. Default preference when unset: {Math.max(18, user.age - 10)}-{user.age + 10}.</p>
      <form action="/api/filters" method="post" className="space-y-2">
        <label className="block text-sm">Preferred age min</label>
        <input className="card w-full" name="preferredAgeMin" type="number" min={18} defaultValue={defaults.min} />
        <label className="block text-sm">Preferred age max</label>
        <input className="card w-full" name="preferredAgeMax" type="number" min={18} defaultValue={defaults.max} />
        <button className="card w-full">Save filters</button>
      </form>
    </main>
  );
}
