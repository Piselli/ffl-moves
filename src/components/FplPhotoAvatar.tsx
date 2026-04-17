"use client";

import { cn } from "@/lib/utils";
import {
  fplPhotoCodeFromUrl,
  fplSpriteStyle,
  getFplPhotoFrame,
  hasFplAtlas,
} from "@/lib/fpl-photo-atlas";
import type { CSSProperties } from "react";

type Props = {
  /** FPL `element.code` from API — preferred */
  fplPhotoCode?: number | null;
  /** Full photo URL — used for fallback and to derive code */
  photoUrl?: string | null;
  alt: string;
  className?: string;
  /** Square size in px */
  size: number;
  /** Position letter if no photo */
  positionFallback?: string;
  positionFallbackClassName?: string;
};

export function FplPhotoAvatar({
  fplPhotoCode,
  photoUrl,
  alt,
  className,
  size,
  positionFallback = "?",
  positionFallbackClassName,
}: Props) {
  const code =
    fplPhotoCode != null && fplPhotoCode > 0
      ? String(fplPhotoCode)
      : fplPhotoCodeFromUrl(photoUrl || undefined);
  const frame = code ? getFplPhotoFrame(code) : null;
  const useSprite = hasFplAtlas() && frame != null;

  if (useSprite && frame) {
    const style: CSSProperties = {
      ...fplSpriteStyle(frame, size),
      minWidth: size,
      minHeight: size,
    };
    return (
      <div
        role="img"
        aria-label={alt}
        title={alt}
        className={cn("shrink-0 bg-[#0A0D14] overflow-hidden", className)}
        style={style}
      />
    );
  }

  const showImg = Boolean(photoUrl);
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden flex items-center justify-center bg-black/40",
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt={alt}
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
            const fb = img.nextElementSibling as HTMLElement;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <span
        className={cn(
          "text-[11px] font-black items-center justify-center absolute inset-0",
          positionFallbackClassName
        )}
        style={{ display: showImg ? "none" : "flex" }}
      >
        {positionFallback}
      </span>
    </div>
  );
}
