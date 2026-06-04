"use client";

import { cn } from "@/lib/utils";
import { Wc2026LogoPlate, type WcHeroLogoVariant } from "@/components/wc/Wc2026LogoPlate";

/** Switch to `"trophy"` to compare the trophy-only asset */
const HERO_LOGO_VARIANT: WcHeroLogoVariant = "26";

const FLAGS_W = 910;
const FLAGS_H = 429;

/**
 * Feather the collage edges into the page bg so the PNG has no hard rectangle.
 * Left edge fades hardest (faces the text), right/top/bottom dissolve softly.
 * Layers are intersected so every edge must be opaque to show.
 */
const FLAGS_MASK = [
  "linear-gradient(to right, transparent 0%, #000 22%)",
  "linear-gradient(to left, transparent 0%, #000 9%)",
  "linear-gradient(to bottom, transparent 0%, #000 11%, #000 88%, transparent 100%)",
].join(", ");

/** Flag collage + WC logo (black asset) centered on the mosaic. */
export function WcHeroFlagsPanel({
  className,
  variant = "overlay",
}: {
  className?: string;
  variant?: "overlay" | "inline";
}) {
  const isOverlay = variant === "overlay";

  return (
    <div
      className={cn(
        "relative leading-none",
        isOverlay && "flex h-full max-h-full w-full items-center justify-end",
        !isOverlay && "mx-auto w-full max-w-[min(96vw,860px)]",
        className,
      )}
    >
      <div className="relative h-full max-h-full">
        <img
          src="/images/wc-hero-flags-bg.png"
          alt=""
          width={FLAGS_W}
          height={FLAGS_H}
          className={cn(
            "block h-full max-h-full w-auto max-w-full object-contain object-right",
            !isOverlay && "h-auto w-full",
          )}
          style={
            isOverlay
              ? {
                  WebkitMaskImage: FLAGS_MASK,
                  WebkitMaskComposite: "source-in",
                  maskImage: FLAGS_MASK,
                  maskComposite: "intersect",
                }
              : undefined
          }
          draggable={false}
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <Wc2026LogoPlate variant={HERO_LOGO_VARIANT} />
        </div>
      </div>
    </div>
  );
}
