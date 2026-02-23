import Link from 'next/link';

export function Nav() {
  return (
    <nav className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
      <Link className="card" href="/discovery">Discovery</Link>
      <Link className="card" href="/conversations">Chats</Link>
      <Link className="card" href="/roadmap">Roadmap</Link>
    </nav>
  );
}
