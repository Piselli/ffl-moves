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
  accentClassName?: string;
};

/** Display lockup: FORM8, eight in lime. */
export function Form8Wordmark({
  className,
  accentClassName = "text-[#00f948]",
}: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-display font-black uppercase tracking-tighter",
        className,
      )}
    >
      FORM<span className={accentClassName}>8</span>
    </span>
  );
}
