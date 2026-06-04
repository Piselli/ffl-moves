import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hero-aligned section label — green left rule + uppercase tracking. */
export function WcSectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-l-2 border-[#00f948] pl-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00f948]",
        className,
      )}
    >
      {children}
    </span>
  );
}
