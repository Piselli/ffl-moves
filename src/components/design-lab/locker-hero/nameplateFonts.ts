/**
 * Nameplate typefaces for door number-cards.
 * Loaded at module scope (next/font requirement).
 */

import {
  Anton,
  Archivo_Black,
  Barlow_Condensed,
  Bebas_Neue,
  Oswald,
  Russo_One,
  Teko,
} from "next/font/google";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" });
const oswald = Oswald({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
});
const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
const archivo = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const barlow = Barlow_Condensed({
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
});
const teko = Teko({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});
const russo = Russo_One({ weight: "400", subsets: ["latin"], display: "swap" });

export type NameplateFontId =
  | "bebas"
  | "oswald"
  | "anton"
  | "archivo"
  | "barlow"
  | "teko"
  | "russo";

export type NameplateFont = {
  id: NameplateFontId;
  name: string;
  tagline: string;
  family: string;
  /** Extra tracking for surname line */
  tracking: string;
};

export const NAMEPLATE_FONTS: readonly NameplateFont[] = [
  {
    id: "bebas",
    name: "Bebas Neue",
    tagline: "Classic jersey caps",
    family: bebas.style.fontFamily,
    tracking: "0.06em",
  },
  {
    id: "oswald",
    name: "Oswald",
    tagline: "Condensed athletic",
    family: oswald.style.fontFamily,
    tracking: "0.04em",
  },
  {
    id: "anton",
    name: "Anton",
    tagline: "Heavy display punch",
    family: anton.style.fontFamily,
    tracking: "0.02em",
  },
  {
    id: "archivo",
    name: "Archivo Black",
    tagline: "Block stadium ink",
    family: archivo.style.fontFamily,
    tracking: "0.03em",
  },
  {
    id: "barlow",
    name: "Barlow Condensed",
    tagline: "Modern squad list",
    family: barlow.style.fontFamily,
    tracking: "0.05em",
  },
  {
    id: "teko",
    name: "Teko",
    tagline: "LED board energy",
    family: teko.style.fontFamily,
    tracking: "0.08em",
  },
  {
    id: "russo",
    name: "Russo One",
    tagline: "Rounded sports badge",
    family: russo.style.fontFamily,
    tracking: "0.04em",
  },
] as const;

export const DEFAULT_NAMEPLATE_FONT: NameplateFontId = "oswald";
export const NAMEPLATE_FONT_STORAGE_KEY = "ffl:locker-hero:nameplate-font";

/** Locked production pick — number card + Oswald. */
export const ACTIVE_NAMEPLATE_FONT: NameplateFontId = "oswald";

export function getNameplateFont(id: NameplateFontId): NameplateFont {
  return NAMEPLATE_FONTS.find((f) => f.id === id) ?? NAMEPLATE_FONTS[0]!;
}

export function loadNameplateFontId(): NameplateFontId {
  if (typeof window === "undefined") return DEFAULT_NAMEPLATE_FONT;
  try {
    const raw = window.localStorage.getItem(NAMEPLATE_FONT_STORAGE_KEY);
    if (NAMEPLATE_FONTS.some((f) => f.id === raw)) {
      return raw as NameplateFontId;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_NAMEPLATE_FONT;
}

export function saveNameplateFontId(id: NameplateFontId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAMEPLATE_FONT_STORAGE_KEY, id);
}
