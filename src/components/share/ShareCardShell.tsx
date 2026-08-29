"use client";

import { Form8Mark } from "@/components/Form8Mark";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import {
  SQUAD_SHARE_CARD_HEIGHT,
  SQUAD_SHARE_CARD_WIDTH,
  SHARE_CARD_BORDER,
  SHARE_CARD_CORNER_RADIUS_PX,
} from "@/components/share/shareCardTypes";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const SHARE_TEXTURE_NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")";

function ShareCardAtmosphere({
  surface,
}: {
  surface: "default" | "tablet" | "charcoal";
}) {
  if (surface === "tablet") {
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage: SHARE_TEXTURE_NOISE,
            backgroundSize: "220px 220px",
            mixBlendMode: "overlay",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(88% 82% at 16% 24%, rgba(255,255,255,0.07) 0%, transparent 54%)",
              "radial-gradient(72% 70% at 90% 82%, rgba(0,0,0,0.45) 0%, transparent 56%)",
              "linear-gradient(160deg, rgba(255,255,255,0.025) 0%, transparent 42%, rgba(0,0,0,0.28) 100%)",
            ].join(", "),
          }}
        />
      </>
    );
  }

  if (surface === "charcoal") {
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: SHARE_TEXTURE_NOISE,
            backgroundSize: "220px 220px",
            mixBlendMode: "overlay",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(90% 85% at 18% 28%, rgba(255,255,255,0.11) 0%, transparent 52%)",
              "radial-gradient(70% 75% at 88% 78%, rgba(0,0,0,0.55) 0%, transparent 58%)",
              "linear-gradient(165deg, rgba(255,255,255,0.04) 0%, transparent 38%, rgba(0,0,0,0.35) 100%)",
            ].join(", "),
          }}
        />
      </>
    );
  }

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 70% 45%, rgba(0,249,72,0.03) 0%, transparent 55%)",
        }}
      />
    </>
  );
}

export function ShareCardShell({
  children,
  className,
  footer,
  surface = "default",
}: {
  children: ReactNode;
  className?: string;
  /** Optional bottom fascia; omit for full-bleed body variants. */
  footer?: ReactNode;
  /** tablet = pure black · charcoal = locker locked share atmosphere */
  surface?: "default" | "tablet" | "charcoal";
}) {
  const typeface = getTypeface();
  const tablet = surface === "tablet";
  const charcoal = surface === "charcoal";

  return (
    <div
      data-share-card
      className={cn(
        "relative overflow-hidden text-white select-none",
        className,
      )}
      style={{
        width: SQUAD_SHARE_CARD_WIDTH,
        height: SQUAD_SHARE_CARD_HEIGHT,
        borderRadius: SHARE_CARD_CORNER_RADIUS_PX,
        boxSizing: "border-box",
        border: SHARE_CARD_BORDER,
        fontFamily: typeface.ui,
        background: tablet ? "#000000" : charcoal ? "#161618" : "#08090b",
        boxShadow: tablet
          ? "0 28px 72px rgba(0,0,0,0.85)"
          : charcoal
            ? "0 32px 64px rgba(0,0,0,0.78)"
            : "0 28px 72px rgba(0,0,0,0.72)",
      }}
    >
      <ShareCardAtmosphere surface={surface} />
      {children}
      {footer}
    </div>
  );
}

export function ShareCardBrandRow({
  siteUrl,
  className,
}: {
  siteUrl?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Form8Mark className="h-7 w-auto shrink-0" priority />
      <span className="text-[18px] font-semibold lowercase tracking-[-0.02em] text-white/88">
        form8
      </span>
      {siteUrl ? (
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-white/24">
          {siteUrl}
        </span>
      ) : null}
    </div>
  );
}

export function ShareCardLockedPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00f948]/35 bg-[#00f948]/[0.06] px-2.5 py-1">
      <span className="h-1 w-1 rounded-full bg-[#00f948]" />
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#00f948]/95">
        {label}
      </span>
    </span>
  );
}
