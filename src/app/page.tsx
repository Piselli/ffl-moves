"use client";

import dynamic from "next/dynamic";
import { PageRouteLoading } from "@/components/PageRouteLoading";

const LockerHero = dynamic(
  () =>
    import("@/components/design-lab/locker-hero/LockerHero").then((m) => m.LockerHero),
  { ssr: false, loading: () => <PageRouteLoading /> },
);

/**
 * Production homepage = locker room + tablet.
 * Lab mixer stays at /design-lab/locker-hero. Classic landing at /classic.
 */
export default function HomePage() {
  return <LockerHero variant="site" />;
}
