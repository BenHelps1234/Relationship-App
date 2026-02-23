export default function AdminPage() {
  return (
    <main className="space-y-3">
      <h1 className="text-xl">Admin / Enforcement (stub)</h1>
      <p className="card">Ban state machine implemented: active/banned. Banned users cannot login.</p>
      <p className="card">Placeholder fields include risk_fingerprint_hash for suspected same-user linkage later.</p>
      <p className="card">Re-register after ban: signup fee text placeholder only for now.</p>
      <p className="card">Video safety placeholder: moving watermark with username + session ID will be required in phase 2.</p>
    </main>
  );
}
