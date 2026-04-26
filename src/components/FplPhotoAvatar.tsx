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
  /** Position letter when no photo (e.g. GK) — shown as small badge on generated avatar */
  positionFallback?: string;
  positionFallbackClassName?: string;
  /** Club / team name — stable tint for generated avatar when photo missing */
  teamName?: string | null;
  /** Override initials (e.g. `webName`) */
  initials?: string | null;
  /** Fixed hue 0–359 instead of hashing `teamName` or `alt` */
  accentHue?: number | null;
};

function SilhouettePlate() {
  return (
    <svg
      className="absolute inset-0 w-full h-full text-white pointer-events-none"
      viewBox="0 0 64 80"
      fill="currentColor"
      aria-hidden
    >
      <ellipse cx="32" cy="22" rx="14" ry="15" opacity="0.14" />
      <path
        d="M16 78c4-18 12-26 16-26s12 8 16 26"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
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
  positionFallback = "?",
  positionFallbackClassName,
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
  const showGenerated = !useSprite && (!showImg || imgFailed);

  const initials =
    (initialsProp && initialsProp.trim()) || initialsFromDisplayName(alt);
  const hue =
    accentHue != null && accentHue >= 0
      ? Math.round(accentHue) % 360
      : hueFromString((teamName && teamName.trim()) || alt);

  const plateStyle: CSSProperties = {
    background: `linear-gradient(145deg, hsl(${hue} 48% 34%) 0%, hsl(${hue} 40% 18%) 42%, #080a10 100%)`,
  };

  const initialsFont = Math.max(11, Math.min(22, Math.round(size * 0.34)));

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
        "relative shrink-0 overflow-hidden flex items-center justify-center bg-[#0A0D14]",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Tint plate + silhouette — visible under broken/missing photo */}
      <div className="absolute inset-0 z-0" style={plateStyle}>
        <SilhouettePlate />
      </div>

      {showRaster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt=""
          className="absolute inset-0 z-[1] h-full w-full object-cover object-top"
          onError={() => setImgFailed(true)}
        />
      ) : null}

      {/* Initials + corner position when no usable raster */}
      <div
        className={cn(
          "absolute inset-0 z-[2] flex items-center justify-center px-0.5",
          showRaster ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <span
          className="font-black leading-none tracking-tight text-white/95 drop-shadow-md select-none"
          style={{ fontSize: initialsFont }}
        >
          {initials}
        </span>
        {positionFallback && positionFallback !== "?" ? (
          <span
            className={cn(
              "absolute bottom-0.5 right-0.5 rounded px-1 py-px text-[7px] font-black uppercase leading-none bg-black/50 text-white/85 border border-white/15",
              positionFallbackClassName
            )}
          >
            {positionFallback}
          </span>
        ) : null}
      </div>
    </div>
  );
}
