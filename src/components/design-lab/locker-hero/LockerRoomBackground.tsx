"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  src?: string;
  /** Tailwind object-* position, e.g. object-center / object-[center_62%] */
  objectClassName?: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
};

/** Locker plate: atmosphere is baked into the asset — keep the compositor thin. */
export function LockerRoomBackground({
  className,
  src = "/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png",
  objectClassName = "object-center",
  onImageLoad,
  onImageError,
}: Props) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#1a1816]", className)}>
      <Image
        key={src}
        src={src}
        alt=""
        fill
        priority
        unoptimized
        quality={95}
        sizes="100vw"
        className={cn("object-cover", objectClassName)}
        style={{ imageRendering: "auto" }}
        onLoad={onImageLoad}
        onError={onImageError}
      />
      {/* Light edge falloff only — scene grade already carries mood */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 60% at 50% 48%, transparent 0%, transparent 55%, rgba(10,9,8,0.18) 82%, rgba(8,7,6,0.4) 100%)",
        }}
      />
    </div>
  );
}
