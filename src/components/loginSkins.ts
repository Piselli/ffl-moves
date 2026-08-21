import type { CSSProperties } from "react";

/** Locked login plaque — locker / GlassPanel look. */
export type LoginSkinTheme = {
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
};

export const LOGIN_THEME: LoginSkinTheme = {
  googleMono: false,
  continueKind: "arrow",
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
};
