"use client";

import dynamic from "next/dynamic";
import { PageRouteLoading } from "@/components/PageRouteLoading";

const LadderWallShell = dynamic(
  () => import("@/components/season/LadderWallShell").then((m) => m.LadderWallShell),
  { ssr: false, loading: () => <PageRouteLoading /> },
);

/** Shipping season standings — Ladder Wall (classic table at /season-leaderboard/classic). */
export default function SeasonLeaderboardPage() {
  return <LadderWallShell />;
}
