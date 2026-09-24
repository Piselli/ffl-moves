import type { CSSProperties } from "react";
import {
  NAV_WHITE_CTA_STYLE,
  SHARE_SQUAD_CTA_STYLE,
} from "@/components/design-lab/locker-hero/ctaStyles";

/** Flat peers — no tray (avoids clipping CTA shadows). */
export const NAV_UTILITY_TRAY = "inline-flex shrink-0 items-center gap-1.5";

export const NAV_TRAY_BTN =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-3 font-display text-[11px] font-black uppercase leading-none tracking-wide transition-[filter,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f948]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-black/80";

/** Variant D — Deposit / Connect: white convex + green halo (share CTA). */
export const navDepositCtaStyle: CSSProperties = SHARE_SQUAD_CTA_STYLE;
export const navWhiteCtaStyle: CSSProperties = NAV_WHITE_CTA_STYLE;

/** @deprecated alias — use navDepositCtaStyle */
export const navGreenCtaStyle = navDepositCtaStyle;
export const NAV_WHITE_CTA_CLASS = NAV_TRAY_BTN;
