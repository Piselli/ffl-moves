"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  fplPhotoCodeFromUrl,
  fplSpriteStyle,
  getFplPhotoFrame,
  hasFplAtlas,
} from "@/lib/fpl-photo-atlas";
import { initialsFromDisplayName } from "@/lib/avatar-fallback";
import { apiSportsPhotoProxyPath, playerPhotoCandidates, resolveEaFaceId } from "@/lib/playerPhoto";
import type { CSSProperties } from "react";

type Props = {
  /** FPL `element.code` from API — preferred */
  fplPhotoCode?: number | null;
  /** API-Sports id — World Cup catalog */
  apiId?: number | null;
  /** EA FC resource id — FC27 miniface */
  eaFaceId?: number | null;
  /** Full photo URL — used for fallback and to derive code */
  photoUrl?: string | null;
  alt: string;
  className?: string;
  /** Square size in px */
  size: number;
  /** Kept for call-site compat; plate is brand-unified (not team-tinted). */
  teamName?: string | null;
  /** Override initials (e.g. `webName`) */
  initials?: string | null;
  /** Optional one-off hue 0–359; default is the shared brand plate */
  accentHue?: number | null;
  /** Skip the viewport gate — pitch chips are already on-screen (incl. 3D Html). */
  eager?: boolean;
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

/** Prefetch when near the visible area of the nearest scroll parent (or viewport). */
function useNearViewport<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(!enabled);
  useEffect(() => {
    if (!enabled) {
      setNear(true);
      return;
    }
    const el = ref.current;
    if (!el || near) return;

    let root: Element | null = el.parentElement;
    while (root && root !== document.body) {
      const { overflowY } = getComputedStyle(root);
      if (
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay"
      ) {
        break;
      }
      root = root.parentElement;
    }
    if (root === document.body) root = null;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      {
        root,
        // Load a few rows ahead inside the picker scroller.
        rootMargin: "480px 0px",
        threshold: 0.01,
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, enabled]);
  return { ref, near };
}

export function FplPhotoAvatar({
  fplPhotoCode,
  apiId,
  eaFaceId,
  photoUrl,
  alt,
  className,
  size,
  teamName: _teamName,
  initials: initialsProp,
  accentHue,
  eager = false,
}: Props) {
  const { ref, near } = useNearViewport<HTMLDivElement>(!eager);
  const allowRemote = eager || near;
  // Track BOTH "loaded" and "failed" so the fallback can render underneath the
  // <img> until the request actually succeeds. This prevents the browser's
  // default broken-image icon from flashing while the request is in-flight or
  // when the request 403s (PL CDN sometimes blocks newer/transferred players).
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [urlIndex, setUrlIndex] = useState(0);
  const [retryTick, setRetryTick] = useState(0);

  const photoCandidates = useMemo(
    () =>
      playerPhotoCandidates({
        photo: photoUrl ?? undefined,
        fplPhotoCode: fplPhotoCode ?? undefined,
        apiId: apiId ?? undefined,
        eaFaceId: eaFaceId ?? undefined,
      }),
    [photoUrl, fplPhotoCode, apiId, eaFaceId],
  );

  const hasEaFace =
    resolveEaFaceId({
      eaFaceId: eaFaceId ?? undefined,
      fplPhotoCode: fplPhotoCode ?? undefined,
    }) != null;
  const hasFpl =
    (fplPhotoCode != null && fplPhotoCode > 0) ||
    Boolean(fplPhotoCodeFromUrl(photoUrl || undefined));
  // World Cup-only portraits: API-Sports when we have no FPL/EA mapping.
  const wcPortraitSrc =
    !hasEaFace && !hasFpl && apiId != null && apiId > 0
      ? apiSportsPhotoProxyPath(apiId)
      : null;

  const candidateKey = photoCandidates.join("|");
  const portraitKey = wcPortraitSrc ?? candidateKey;

  useEffect(() => {
    setImgFailed(false);
    setImgLoaded(false);
    setUrlIndex(0);
    setRetryTick(0);
  }, [portraitKey]);

  const resolvedPhotoUrl = useMemo(() => {
    const base = wcPortraitSrc ?? photoCandidates[urlIndex] ?? null;
    if (!base || retryTick === 0) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}_retry=${retryTick}`;
  }, [wcPortraitSrc, photoCandidates, urlIndex, retryTick]);

  const code =
    fplPhotoCode != null && fplPhotoCode > 0
      ? String(fplPhotoCode)
      : fplPhotoCodeFromUrl(photoUrl || undefined);
  const frame = code ? getFplPhotoFrame(code) : null;
  // Prefer EA FC27 heads over the kit-era atlas sprite when mapped.
  const useSprite = hasFplAtlas() && frame != null && !hasEaFace;
  const showImg =
    Boolean(resolvedPhotoUrl) && !imgFailed && !useSprite && allowRemote;
  const fallbackVisible = !imgLoaded || imgFailed;

  const initials =
    (initialsProp && initialsProp.trim()) || initialsFromDisplayName(alt);

  // One brand plate for every chip — team-tinted hues looked noisy behind
  // transparent EA heads. Optional accentHue still allows rare one-offs.
  const plateStyle: CSSProperties =
    accentHue != null && accentHue >= 0
      ? {
          background: `linear-gradient(168deg, hsl(${Math.round(accentHue) % 360} 18% 22%) 0%, hsl(${Math.round(accentHue) % 360} 12% 12%) 55%, #050608 100%)`,
        }
      : {
          background:
            "radial-gradient(ellipse 90% 70% at 50% 28%, rgba(0,249,72,0.10) 0%, transparent 55%), linear-gradient(168deg, #14181f 0%, #0a0d12 52%, #050608 100%)",
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
      ref={ref}
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

      {/* Silhouette + monogram — ALWAYS rendered underneath. The <img> fades in
          on top after onLoad fires, so a 403/404/loading state never shows the
          browser's broken-image icon. */}
      <div
        className={cn(
          "absolute inset-0 z-[2] flex flex-col items-center justify-end pointer-events-none transition-opacity duration-200",
          fallbackVisible ? "opacity-100" : "opacity-0"
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

      {/* Photo — only mounted when there's a URL and it hasn't failed yet.
          We keep it on a higher z-index than the fallback and fade in on load. */}
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedPhotoUrl!}
          alt=""
          className={cn(
            "absolute inset-0 z-[3] h-full w-full object-cover object-top transition-opacity duration-200",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
          referrerPolicy="no-referrer"
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            if (retryTick < 2) {
              setRetryTick((t) => t + 1);
              setImgLoaded(false);
              return;
            }
            if (urlIndex + 1 < photoCandidates.length) {
              setUrlIndex((i) => i + 1);
              setRetryTick(0);
              setImgLoaded(false);
            } else {
              setImgFailed(true);
            }
          }}
        />
      ) : null}
    </div>
  );
}
