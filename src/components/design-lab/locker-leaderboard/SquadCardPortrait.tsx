"use client";

import { useEffect, useMemo, useState } from "react";
import { fplPhotoCodeFromName } from "@/lib/fpl-photo-from-name";
import { pitchCutoutPhotoCandidates } from "@/lib/playerPhoto";
import { cn } from "@/lib/utils";
import type { LabSquadPlayer } from "./mockData";

function markIfComplete(img: HTMLImageElement | null, onReady: () => void) {
  if (!img) return;
  if (img.complete && img.naturalHeight > 0) onReady();
}

/**
 * Full-bust portrait — contain so head isn’t cropped.
 * Parent should use items-end so torso sits flush on the dock.
 */
export function SquadCardPortrait({
  player,
  teamName,
  className,
}: {
  player: LabSquadPlayer;
  teamName?: string | null;
  className?: string;
}) {
  void teamName;
  const code =
    player.fplPhotoCode != null && player.fplPhotoCode > 0
      ? player.fplPhotoCode
      : fplPhotoCodeFromName(player.name, player.teamId);

  const candidates = useMemo(
    () =>
      pitchCutoutPhotoCandidates({
        photo: player.photo,
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
    <div
      className={cn(
        "relative flex h-full w-full items-end justify-center overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full w-full items-end justify-center transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        )}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            ref={(el) => markIfComplete(el, () => setLoaded(true))}
            src={src!}
            alt=""
            decoding="async"
            className="max-h-full max-w-full object-contain object-bottom"
            style={{
              imageRendering: "auto",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
            }}
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
      </div>

      {!showImg || !loaded ? (
        <div className="absolute inset-0 flex items-end justify-center bg-transparent">
          <div
            className="flex h-[88%] w-auto items-end justify-center text-white/25"
            aria-hidden
          >
            <svg
              viewBox="0 0 64 80"
              className="h-full w-auto"
              fill="currentColor"
            >
              <path d="M32 15c7.2 0 13 5.6 13 12.5 0 5.2-3.1 9.7-7.6 11.7 9.2 2.2 15.6 10.4 15.6 20.2V68H10v-8.6c0-9.8 6.4-18 15.6-20.2C21.1 37.2 18 32.7 18 27.5 18 20.6 23.8 15 32 15z" />
            </svg>
          </div>
        </div>
      ) : null}
    </div>
  );
}
