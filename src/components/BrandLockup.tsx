import Link from "next/link";
import { Form8Mark } from "@/components/Form8Mark";
import { cn } from "@/lib/utils";

type Props = {
  priority?: boolean;
  className?: string;
  linkClassName?: string;
};

/**
 * Shipping brand lockup — form8 · Inter Semibold · Polymarket scale.
 */
export function BrandLockup({
  priority = false,
  className,
  linkClassName,
}: Props) {
  return (
    <Link
      href="/"
      aria-label="form8"
      className={cn(
        "group shrink-0 transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-95 active:scale-[0.98]",
        linkClassName,
      )}
    >
      <span
        className={cn(
          "inline-flex h-10 items-center gap-3.5 sm:h-11",
          className,
        )}
      >
        <Form8Mark alt="" priority={priority} className="h-9 sm:h-10" />
        <span className="font-sans text-[23px]/none font-semibold lowercase tracking-[-0.02em] text-white sm:text-[25px]/none">
          form8
        </span>
      </span>
    </Link>
  );
}

/** Polymarket-style nav shell — one centered row, edges align with content. */
export const BRAND_LOCKUP_NAV_INNER =
  "relative mx-auto flex h-[4.25rem] w-full max-w-[1400px] items-center gap-4 px-6 sm:h-[4.5rem] sm:px-8 lg:px-10";
