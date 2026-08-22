"use client";

import dynamic from "next/dynamic";

const LockerHero = dynamic(
  () =>
    import("@/components/design-lab/locker-hero/LockerHero").then((m) => m.LockerHero),
  {
    ssr: false,
    // Match LockerHeroBoot so chunk load → hero never flashes a different shell size.
    loading: () => (
      <div
        aria-hidden
        className="fixed inset-0 z-[45] bg-[#1a1816]"
      />
    ),
  },
);

/**
 * Production homepage = locker room + tablet.
 * Lab mixer stays at /design-lab/locker-hero. Classic landing at /classic.
 */
export default function HomePage() {
  return <LockerHero variant="site" />;
}
