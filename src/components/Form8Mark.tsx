import { cn } from "@/lib/utils";

/**
 * Small PNG mark for UI + share capture.
 * Full-res PNG is 3616×4944 (OOM in export); SVG often vanishes in Phantom WebViews.
 */
export const FORM8_MARK_SRC = "/brand/form8-mark-share.png";
/** Cropped +15 stencil A. Source art box (share asset is 94×128). */
export const FORM8_MARK_WIDTH = 94;
export const FORM8_MARK_HEIGHT = 128;

type MarkProps = {
  className?: string;
  alt?: string;
  /** @deprecated Ignored — plain <img> for share-export reliability. */
  priority?: boolean;
};

/**
 * Locked form8 logomark — A-waist, halves spread +15.
 * Plain <img> + small PNG so squad PNG capture embeds in wallet WebViews
 * (next/image + huge PNG → empty square; SVG → missing mark in Phantom).
 */
export function Form8Mark({ className, alt = "FORM8" }: MarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- share capture needs a real <img>, not next/image
    <img
      data-share-mark=""
      src={FORM8_MARK_SRC}
      alt={alt}
      width={FORM8_MARK_WIDTH}
      height={FORM8_MARK_HEIGHT}
      draggable={false}
      className={cn("block h-8 w-auto shrink-0", className)}
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
    <span
      data-share-lockup=""
      className={cn("inline-flex h-6 items-center gap-2.5", className)}
      style={{ verticalAlign: "middle" }}
    >
      <Form8Mark
        alt=""
        priority={priority}
        className={cn("h-6", markClassName)}
      />
      {markOnly ? null : (
        <Form8Wordmark
          className={cn(
            "whitespace-nowrap text-[18px]/none leading-none text-white sm:text-[21px]/none",
            wordmarkClassName,
          )}
        />
      )}
    </span>
  );
}
