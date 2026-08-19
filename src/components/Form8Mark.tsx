import Image from "next/image";
import { cn } from "@/lib/utils";

export const FORM8_MARK_SRC = "/brand/form8-mark.png";
/** Cropped +15 stencil A. Source PNG is 8× this box. */
export const FORM8_MARK_WIDTH = 452;
export const FORM8_MARK_HEIGHT = 618;

type MarkProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

/** Locked form8 logomark — A-waist, halves spread +15. White glyph, transparent ground. */
export function Form8Mark({
  className,
  alt = "FORM8",
  priority = false,
}: MarkProps) {
  return (
    <Image
      src={FORM8_MARK_SRC}
      alt={alt}
      width={FORM8_MARK_WIDTH}
      height={FORM8_MARK_HEIGHT}
      className={cn("h-8 w-auto shrink-0", className)}
      priority={priority}
    />
  );
}

type WordmarkProps = {
  className?: string;
  /** @deprecated Wordmark is one color. Kept so old call sites compile. */
  accentClassName?: string;
};

/** Wordmark is a single color. Lime stays on CTAs, not inside the name. */
export function Form8Wordmark({ className }: WordmarkProps) {
  return (
    <span
      className={cn(
        "[font-family:var(--font-display),sans-serif] font-black uppercase leading-none tracking-[-0.03em]",
        className,
      )}
    >
      FORM8
    </span>
  );
}

type LockupProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  markOnly?: boolean;
  priority?: boolean;
};

/**
 * Header lockup: portrait stencil + name as one unit.
 * 24px row. Mark fills the row; 21px caps sit on the same optical center.
 * Gap ≈ 0.55× mark width so the stencil does not glue to the type.
 */
export function Form8Lockup({
  className,
  markClassName,
  wordmarkClassName,
  markOnly = false,
  priority = false,
}: LockupProps) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-2.5", className)}>
      <Form8Mark
        alt=""
        priority={priority}
        className={cn("h-6", markClassName)}
      />
      {markOnly ? null : (
        <Form8Wordmark
          className={cn(
            "whitespace-nowrap text-[18px]/none text-white sm:text-[21px]/none",
            wordmarkClassName,
          )}
        />
      )}
    </span>
  );
}
