import type { CSSProperties } from "react";

export const LOGIN_SKINS = ["current", "crystal", "locker"] as const;
export type LoginSkin = (typeof LOGIN_SKINS)[number];

export const LOGIN_SKIN_STORAGE_KEY = "ffl:login-skin";

export function isLoginSkin(value: string): value is LoginSkin {
  return (LOGIN_SKINS as readonly string[]).includes(value);
}

export function loadLoginSkin(): LoginSkin {
  if (typeof window === "undefined") return "current";
  try {
    const saved = window.localStorage.getItem(LOGIN_SKIN_STORAGE_KEY);
    if (saved && isLoginSkin(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "current";
}

export function saveLoginSkin(id: LoginSkin) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOGIN_SKIN_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export type LoginSkinTheme = {
  id: LoginSkin;
  /** Crystal uses Polymarket-style title + OR + footer. Current keeps existing copy/chrome. */
  polyLayout: boolean;
  googleMono: boolean;
  continueKind: "arrow" | "text";
  plaqueClass: string;
  plaqueStyle?: CSSProperties;
  titleClass: string;
  googleClass: string;
  googleStyle?: CSSProperties;
  inputClass: string;
  continueClass: string;
  continueStyle?: CSSProperties;
  orLineClass: string;
  orTextClass: string;
  closeClass: string;
  footerClass: string;
  /** Claim-prize GlassPanel shell from the locker tablet. */
  glass?: boolean;
};

export const LOGIN_SKIN_THEMES: Record<LoginSkin, LoginSkinTheme> = {
  current: {
    id: "current",
    polyLayout: false,
    googleMono: false,
    continueKind: "arrow",
    plaqueClass:
      "relative z-10 w-full max-w-[570px] overflow-hidden rounded-3xl border border-white/12 bg-[#0e0d0c]/82 p-8 shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-9",
    titleClass: "text-[33px] font-semibold tracking-tight text-white",
    googleClass:
      "flex h-[72px] w-full items-center justify-center gap-4 rounded-full border border-white/10 bg-white/[0.06] text-[22px] font-semibold text-white transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/20 hover:bg-white/[0.1] active:scale-[0.97] disabled:opacity-50",
    inputClass:
      "h-[72px] w-full rounded-full border border-white/10 bg-white/[0.04] px-7 pr-[5.25rem] text-[22px] text-white outline-none placeholder:text-white/35 transition-[border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-[#00f948]/40",
    continueClass:
      "absolute right-2.5 top-2.5 grid h-[54px] w-[54px] place-items-center rounded-full bg-white text-black transition-[transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.96] disabled:opacity-40",
    orLineClass: "h-px flex-1 bg-white/12",
    orTextClass: "text-[16px] font-semibold tracking-[0.14em] text-white/35",
    closeClass:
      "absolute right-1.5 top-1.5 z-30 grid h-10 w-10 place-items-center rounded-full text-white/45 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.06] hover:text-white/80 active:scale-[0.96]",
    footerClass: "text-[16px] text-white/35",
  },
  crystal: {
    id: "crystal",
    polyLayout: true,
    googleMono: false,
    continueKind: "arrow",
    plaqueClass:
      "relative z-10 w-full max-w-[600px] overflow-hidden rounded-[33px] px-9 pb-8 pt-10 sm:px-10 sm:pb-9 sm:pt-12",
    plaqueStyle: {
      background: "rgba(8,10,14,0.42)",
      backdropFilter: "blur(48px)",
      WebkitBackdropFilter: "blur(48px)",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -20px 40px rgba(0,0,0,0.5), 0 18px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
    },
    titleClass: "text-[33px] font-black tracking-tight text-white",
    googleClass:
      "flex h-[72px] w-full items-center justify-center gap-3.5 rounded-[21px] border border-white/18 bg-white/[0.08] text-[22px] font-extrabold text-white transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/28 hover:bg-white/[0.12] active:scale-[0.97] disabled:opacity-50",
    inputClass:
      "h-[72px] w-full rounded-[21px] border border-white/20 bg-black/30 px-6 pr-[5.25rem] text-[22px] font-semibold text-white outline-none placeholder:text-white/40 transition-[border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-[#00f948]/45",
    continueClass:
      "absolute right-2.5 top-2.5 grid h-[54px] w-[54px] place-items-center rounded-full bg-white text-black transition-[transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.96] disabled:opacity-40",
    orLineClass: "h-px flex-1 bg-white/22",
    orTextClass: "text-[16px] font-bold tracking-[0.16em] text-white/45",
    closeClass:
      "absolute right-1.5 top-1.5 z-30 grid h-10 w-10 place-items-center rounded-full text-white/45 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.08] hover:text-white/85 active:scale-[0.96]",
    footerClass: "text-[18px] text-white/40",
  },
  locker: {
    id: "locker",
    polyLayout: true,
    googleMono: false,
    continueKind: "arrow",
    glass: true,
    plaqueClass: "relative z-10 w-full max-w-[570px]",
    titleClass: "text-[33px] font-black tracking-tight text-white",
    googleClass:
      "flex h-[72px] w-full items-center justify-center gap-3.5 rounded-xl border border-white/20 bg-black/35 text-[22px] font-bold text-white/90 transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/35 hover:bg-black/45 active:scale-[0.97] disabled:opacity-50",
    inputClass:
      "h-[72px] w-full rounded-xl border border-white/20 bg-black/40 px-6 pr-[5.25rem] text-[22px] font-semibold text-white outline-none placeholder:text-white/45 transition-[border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-white/40",
    continueClass:
      "absolute right-2.5 top-2.5 grid h-[54px] w-[54px] place-items-center rounded-full bg-white text-black transition-[transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.96] disabled:opacity-40",
    orLineClass: "h-px flex-1 bg-white/15",
    orTextClass: "text-[13px] font-bold uppercase tracking-[0.16em] text-white/40",
    closeClass:
      "absolute right-1.5 top-1.5 z-30 grid h-9 w-9 place-items-center rounded-lg text-white/45 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.06] hover:text-white/85 active:scale-[0.96]",
    footerClass: "text-[16px] text-white/40",
  },
};
