/** Immersive desk scene — no document scroll, no footer bleed. */
export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden">{children}</div>
  );
}
