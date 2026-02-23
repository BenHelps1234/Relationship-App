'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="space-y-3">
      <h1 className="text-xl font-semibold">Auth</h1>
      <input className="card w-full" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="card w-full" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="card w-full" onClick={() => signIn('credentials', { email, password, callbackUrl: '/discovery' })}>Login</button>
      <p className="text-xs text-zinc-400">Signup endpoint exists in onboarding API for MVP.</p>
    </main>
  );
}
