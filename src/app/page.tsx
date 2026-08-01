"use client";

import { LockerHero } from "@/components/design-lab/locker-hero/LockerHero";

/**
 * Production homepage = locker room + tablet.
 * Lab mixer stays at /design-lab/locker-hero. Classic landing at /classic.
 */
export default function HomePage() {
  return <LockerHero variant="site" />;
}
