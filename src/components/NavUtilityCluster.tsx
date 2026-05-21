import type { ReactNode } from "react";

/** 2026-style grouped header utilities: lang · social · wallet in one chip row. */
export function NavUtilityCluster({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center rounded-xl border border-white/10 bg-black/30 p-0.5 backdrop-blur-sm">
      {children}
    </div>
  );
}

export function NavUtilityDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-white/10" aria-hidden />;
}
