"use client";

import { usePathname } from "next/navigation";
import { SiteBackHomeFloat } from "@/components/SiteBackHome";

/** Back-home for World Cup routes without LockerLabNav. */
export function WcLayoutChrome() {
  const pathname = usePathname();
  if (pathname === "/world-cup/squad") return null;
  return <SiteBackHomeFloat />;
}
