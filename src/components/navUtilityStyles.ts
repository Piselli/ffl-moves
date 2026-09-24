import type { CSSProperties } from "react";
import {
  NAV_DEPOSIT_CTA_STYLE,
  NAV_WHITE_CTA_STYLE,
} from "@/components/design-lab/locker-hero/ctaStyles";

/** Flat peers — no tray (avoids clipping CTA shadows). */
export const NAV_UTILITY_TRAY = "inline-flex shrink-0 items-center gap-1.5";

/** Same h-9 as SocialLinkX cluster / disconnect — box-border so shadow never grows height. */
export const NAV_TRAY_BTN =
  "box-border inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-3 font-display text-[11px] font-black uppercase leading-none tracking-wide transition-[filter,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-[1.02] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-1 focus-visible:ring-offset-black/80";

/** Clean white Deposit — no green neon. */
export const navDepositCtaStyle: CSSProperties = NAV_DEPOSIT_CTA_STYLE;
export const navWhiteCtaStyle: CSSProperties = NAV_WHITE_CTA_STYLE;

/** @deprecated alias — use navDepositCtaStyle */
export const navGreenCtaStyle = navDepositCtaStyle;
export const NAV_WHITE_CTA_CLASS = NAV_TRAY_BTN;
