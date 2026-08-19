"use client";

import dynamic from "next/dynamic";
import { PageRouteLoading } from "@/components/PageRouteLoading";

const DeskResultsScene = dynamic(
  () =>
    import("@/components/design-lab/locker-leaderboard/DeskResultsScene").then(
      (m) => m.DeskResultsScene,
    ),
  { ssr: false, loading: () => <PageRouteLoading /> },
);

/** Desk + seated iPad + wall monitor — scene first. Classic: /leaderboard/classic */
export default function LeaderboardPage() {
  return <DeskResultsScene />;
}
