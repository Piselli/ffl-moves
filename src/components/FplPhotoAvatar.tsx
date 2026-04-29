"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  fplPhotoCodeFromUrl,
  fplSpriteStyle,
  getFplPhotoFrame,
  hasFplAtlas,
} from "@/lib/fpl-photo-atlas";
import { hueFromString, initialsFromDisplayName } from "@/lib/avatar-fallback";
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
  /** Club / team name — stable tint for generated avatar when photo missing */
  teamName?: string | null;
  /** Override initials (e.g. `webName`) */
  initials?: string | null;
  /** Fixed hue 0–359 instead of hashing `teamName` or `alt` */
  accentHue?: number | null;
};

/** Minimal bust — single smooth silhouette, no extra strokes or layers */
function FallbackSilhouette({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none text-white", className)}
      viewBox="0 0 64 80"
      fill="currentColor"
      aria-hidden
    >
      <path
        opacity={0.26}
        d="M32 15c7.2 0 13 5.6 13 12.5 0 5.2-3.1 9.7-7.6 11.7 9.2 2.2 15.6 10.4 15.6 20.2V68H10v-8.6c0-9.8 6.4-18 15.6-20.2C21.1 37.2 18 32.7 18 27.5 18 20.6 23.8 15 32 15z"
      />
    </svg>
  );
}

export function FplPhotoAvatar({
  fplPhotoCode,
  photoUrl,
  alt,
  className,
  size,
  teamName,
  initials: initialsProp,
  accentHue,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl, fplPhotoCode]);

  const code =
    fplPhotoCode != null && fplPhotoCode > 0
      ? String(fplPhotoCode)
      : fplPhotoCodeFromUrl(photoUrl || undefined);
  const frame = code ? getFplPhotoFrame(code) : null;
  const useSprite = hasFplAtlas() && frame != null;

  const showImg = Boolean(photoUrl);
  const showRaster = showImg && !imgFailed;

  const initials =
    (initialsProp && initialsProp.trim()) || initialsFromDisplayName(alt);
  const hue =
    accentHue != null && accentHue >= 0
      ? Math.round(accentHue) % 360
      : hueFromString((teamName && teamName.trim()) || alt);

  const plateStyle: CSSProperties = {
    background: `linear-gradient(168deg, hsl(${hue} 20% 24%) 0%, hsl(${hue} 14% 13%) 52%, #050608 100%)`,
  };

  const initialsSize = Math.max(9, Math.min(16, Math.round(size * 0.22)));
  const silhouetteBox = Math.round(size * 0.56);

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

  return (
    <div
      role="img"
      aria-label={alt}
      title={alt}
      className={cn(
        "relative shrink-0 overflow-hidden flex flex-col bg-[#06080c]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 z-0" style={plateStyle} />
      <div
        className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_85%_65%_at_50%_28%,transparent_0%,rgba(0,0,0,0.38)_100%)]"
        aria-hidden
      />

      {showRaster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt=""
          className="absolute inset-0 z-[2] h-full w-full object-cover object-top"
          onError={() => setImgFailed(true)}
        />
      ) : null}

      {/* Silhouette + monogram — only when no usable raster */}
      <div
        className={cn(
          "absolute inset-0 z-[3] flex flex-col items-center justify-end",
          showRaster ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        style={{ paddingBottom: Math.max(5, Math.round(size * 0.1)) }}
      >
        <div className="flex flex-1 w-full min-h-0 items-center justify-center px-[13%] pt-[7%]">
          <div
            className="flex items-center justify-center shrink-0 [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-h-full"
            style={{ height: silhouetteBox, width: (silhouetteBox * 64) / 80 }}
          >
            <FallbackSilhouette className="h-full w-full" />
          </div>
        </div>
        <span
          className="shrink-0 font-medium leading-none tracking-[0.14em] text-white/48 select-none uppercase"
          style={{ fontSize: initialsSize }}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
