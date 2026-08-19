import { cn } from "@/lib/utils";

/** Date / group label for fixtures and list sections. */
export function SiteSectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 capitalize",
        className,
      )}
    >
      {children}
    </p>
  );
}
