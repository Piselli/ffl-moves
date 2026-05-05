"use client";

import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import type { SiteLocale } from "@/i18n/types";

const OPTIONS: { code: SiteLocale; short: string }[] = [
  { code: "en", short: "EN" },
  { code: "uk", short: "UA" },
];

/** Compact EN/UA toggle — sits in the nav next to wallet controls. */
export function LanguageSwitcher() {
  const { locale, setLocale } = useSiteLocale();
  const aria = useSiteMessages().pages.languageSwitcherAria;

  return (
    <div
      role="group"
      aria-label={aria}
      className="flex shrink-0 rounded-xl border border-white/10 bg-black/30 p-0.5 backdrop-blur-sm"
    >
      {OPTIONS.map(({ code, short }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={`min-w-[2.25rem] rounded-lg px-2 py-1.5 text-[10px] font-black font-display uppercase tracking-wider transition-all ${
              active
                ? "bg-[#00f948]/25 text-[#00f948] shadow-[0_0_12px_rgba(0,249,72,0.25)]"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white/75"
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
