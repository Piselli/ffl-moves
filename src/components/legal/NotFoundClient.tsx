"use client";

import Link from "next/link";
import { useSiteLocale } from "@/i18n/LocaleProvider";
import { getNotFoundCopy } from "@/lib/legal/notFoundCopy";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { SeasonPageWash } from "@/components/season/seasonPageChrome";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import { REGISTER_CTA_CLASS } from "@/components/season/seasonActionShared";
import { cn } from "@/lib/utils";

export function NotFoundClient() {
  const { locale } = useSiteLocale();
  const copy = getNotFoundCopy(locale);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      <main
        className={cn(
          "relative mx-auto flex max-w-4xl flex-col items-center px-5 pb-28 sm:px-8",
          PRODUCT_PAGE_TOP,
        )}
      >
        <GlassPanel matte className="w-full max-w-lg !rounded-2xl">
          <div className="relative px-6 py-10 text-center sm:px-8 sm:py-12">
            <p className="font-display text-[5rem] font-black leading-none tracking-tight text-white/15 sm:text-[6.5rem]">
              404
            </p>
            <h1 className="mt-2 font-display text-3xl font-black lowercase tracking-tight text-white sm:text-4xl">
              {copy.headline}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-white/45">
              {copy.body}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/" className={REGISTER_CTA_CLASS}>
                {copy.primary}
              </Link>
              <Link
                href="/faq"
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60 transition hover:border-white/30 hover:text-white"
              >
                {copy.secondary}
              </Link>
            </div>
          </div>
        </GlassPanel>
      </main>
    </div>
  );
}
