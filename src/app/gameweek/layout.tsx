/**
 * Force dynamic rendering so /gameweek is never served from a stale static shell
 * built when Vercel env or on-chain state differed from today.
 */
export const dynamic = "force-dynamic";

export default function GameweekLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
