import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NAV_UTILITY_TRAY } from "@/components/navUtilityStyles";

type Props = {
  children: ReactNode;
  /** Kept for callers; tray chrome moved to design-lab until a variant ships. */
  tray?: boolean;
  className?: string;
};

/** Header utilities — flat peers for now (see /design-lab/nav-utility). */
export function NavUtilityCluster({ children, className }: Props) {
  return <div className={cn(NAV_UTILITY_TRAY, className)}>{children}</div>;
}

export function NavUtilityDivider() {
  return (
    <span
      className="mx-0.5 h-3.5 w-px shrink-0 bg-gradient-to-b from-transparent via-white/20 to-transparent"
      aria-hidden
    />
  );
}
