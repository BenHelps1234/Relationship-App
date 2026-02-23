'use client';

import { useState } from 'react';

export default function OnboardingPage() {
  const [form, setForm] = useState({ email: '', password: '', gender: 'male', zip: '', bio: '', photoMainUrl: '', incomeSelfReported: 0, heightCm: 170, weightKg: 70 });
  const [result, setResult] = useState('');

  async function submit() {
    const res = await fetch('/api/onboarding', { method: 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    setResult(JSON.stringify(data));
  }

  return (
    <main className="space-y-2">
      <h1 className="text-xl font-semibold">Onboarding</h1>
      {Object.entries(form).map(([key, value]) => (
        <input
          key={key}
          className="card w-full"
          placeholder={key}
          value={String(value)}
          onChange={(e) => setForm((f) => ({ ...f, [key]: ['incomeSelfReported','heightCm','weightKg'].includes(key) ? Number(e.target.value) : e.target.value }))}
        />
      ))}
      <button className="card w-full" onClick={submit}>Create account</button>
      <p className="text-xs break-all">{result}</p>
    </main>
  );
}
