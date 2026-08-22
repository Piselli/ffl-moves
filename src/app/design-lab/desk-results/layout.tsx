/** Design lab desk scene — same viewport lock as shipping leaderboard. */
export default function DeskResultsLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden">{children}</div>
  );
}
