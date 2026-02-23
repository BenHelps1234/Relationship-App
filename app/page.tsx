import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Politically Incorrect Dating App (MVP)</h1>
      <p className="card">High-intent matching with hard limits: 25 profiles/day, 5 likes/day, 15-message conversation gate, city waitlist, and roadmap-based improvement.</p>
      <p className="card">Signup fee placeholder: {process.env.SIGNUP_FEE_PLACEHOLDER}</p>
      <div className="grid grid-cols-2 gap-2">
        <Link className="card text-center" href="/auth">Login / Signup</Link>
        <Link className="card text-center" href="/onboarding">Onboarding</Link>
      </div>
    </main>
  );
}
