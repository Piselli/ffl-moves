"use client";

import { useEffect, useMemo, useState } from "react";
import { fplPhotoCodeFromName } from "@/lib/fpl-photo-from-name";
import { pitchCutoutPhotoCandidates } from "@/lib/playerPhoto";

export type PitchChipCutoutPlayer = {
  name: string;
  webName?: string | null;
  team?: string | null;
  teamId?: number | null;
  photo?: string | null;
  fplPhotoCode?: number | null;
  apiId?: number | null;
};

/**
 * Freestanding bust on the squad-pick pitch and results XI.
 * PL 110×140 cutouts (transparent) — not the opaque atlas plate.
 */
export function PitchChipCutout({
  player,
  name,
  size = 48,
}: {
  player: PitchChipCutoutPlayer;
  name: string;
  size?: number;
}) {
  const frameH = Math.round(size * 1.05);
  const code =
    player.fplPhotoCode != null && player.fplPhotoCode > 0
      ? player.fplPhotoCode
      : fplPhotoCodeFromName(player.webName || name, player.teamId);

  const candidates = useMemo(
    () =>
      pitchCutoutPhotoCandidates({
        photo: player.photo ?? undefined,
        fplPhotoCode: code ?? undefined,
        apiId: player.apiId ?? undefined,
      }),
    [player.photo, player.apiId, code],
  );

  const [urlIndex, setUrlIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrlIndex(0);
    setLoaded(false);
    setFailed(false);
  }, [candidates.join("|")]);

  const src = candidates[urlIndex] ?? null;
  const showImg = Boolean(src) && !failed;

  return (
    <span
      className="relative block shrink-0 overflow-hidden bg-transparent"
      style={{
        width: size,
        height: frameH,
        filter:
          "drop-shadow(0 2px 3px rgba(0,0,0,0.5)) drop-shadow(0 0 0.5px rgba(255,255,255,0.2))",
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={(el) => {
            if (el && el.complete && el.naturalHeight > 0) setLoaded(true);
          }}
          src={src!}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain object-bottom transition-opacity duration-150"
          style={{ opacity: loaded ? 1 : 0 }}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (urlIndex + 1 < candidates.length) {
              setUrlIndex((i) => i + 1);
              setLoaded(false);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : null}

      {!showImg || !loaded ? (
        <span
          className="absolute inset-0 flex items-end justify-center text-white/30"
          aria-hidden
        >
          <svg
            viewBox="0 0 64 80"
            className="h-[88%] w-auto"
            fill="currentColor"
          >
            <path d="M32 15c7.2 0 13 5.6 13 12.5 0 5.2-3.1 9.7-7.6 11.7 9.2 2.2 15.6 10.4 15.6 20.2V68H10v-8.6c0-9.8 6.4-18 15.6-20.2C21.1 37.2 18 32.7 18 27.5 18 20.6 23.8 15 32 15z" />
          </svg>
        </span>
      ) : null}

      <span className="sr-only">{name}</span>
    </span>
  );
}
