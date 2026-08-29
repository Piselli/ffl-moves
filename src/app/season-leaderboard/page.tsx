"use client";

import dynamic from "next/dynamic";
import { PageRouteLoading } from "@/components/PageRouteLoading";

const SeasonStandingsShell = dynamic(
  () =>
    import("@/components/season/SeasonStandingsShell").then(
      (m) => m.SeasonStandingsShell,
    ),
  { ssr: false, loading: () => <PageRouteLoading /> },
);

/** Shipping season standings — dense table. */
export default function SeasonLeaderboardPage() {
  return <SeasonStandingsShell />;
}
