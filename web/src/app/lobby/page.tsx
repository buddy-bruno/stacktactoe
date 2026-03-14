import { redirect } from 'next/navigation';

export default async function LobbyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const variant = (Array.isArray(p.variant) ? p.variant[0] : p.variant) || 'classic';
  const v = variant === 'schach' ? 'schach' : variant === 'pool' ? 'pool' : 'classic';
  const q = new URLSearchParams();
  if (p.join) q.set('join', Array.isArray(p.join) ? p.join[0] : p.join);
  if (p.roulette) q.set('roulette', Array.isArray(p.roulette) ? p.roulette[0] : p.roulette);
  redirect(`/${v}/lobby${q.toString() ? '?' + q.toString() : ''}`);
}
