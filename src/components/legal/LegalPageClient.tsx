"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSiteLocale } from "@/i18n/LocaleProvider";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { SeasonPageWash } from "@/components/season/seasonPageChrome";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { LEGAL_SLUGS, type LegalSlug } from "@/lib/legal/config";
import { cn } from "@/lib/utils";

const PAGE: Record<
  "en" | "uk",
  {
    eyebrow: string;
    titles: Record<LegalSlug, string>;
    nav: Record<LegalSlug | "faq", string>;
  }
> = {
  en: {
    eyebrow: "Legal",
    titles: {
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      risk: "Risk Disclosure",
      cookies: "Cookie Policy",
    },
    nav: {
      terms: "Terms",
      privacy: "Privacy",
      risk: "Risk",
      cookies: "Cookies",
      faq: "FAQ",
    },
  },
  uk: {
    eyebrow: "Юридичне",
    titles: {
      terms: "Умови користування",
      privacy: "Політика конфіденційності",
      risk: "Розкриття ризиків",
      cookies: "Політика cookie",
    },
    nav: {
      terms: "Умови",
      privacy: "Конфіденційність",
      risk: "Ризики",
      cookies: "Cookie",
      faq: "FAQ",
    },
  },
};

type Props = {
  slug: LegalSlug;
  markdownByLocale: { en: string; uk: string };
};

export function LegalPageClient({ slug, markdownByLocale }: Props) {
  const { locale } = useSiteLocale();
  const loc = locale === "uk" ? "uk" : "en";
  const copy = PAGE[loc];
  const markdown = markdownByLocale[loc] || markdownByLocale.en;

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [markdown, slug]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      <main className={cn("relative mx-auto max-w-4xl px-5 pb-28 sm:px-8", PRODUCT_PAGE_TOP)}>
        <header className="mb-5 sm:mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {copy.eyebrow}
          </p>
          <h1 className="mt-0.5 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {copy.titles[slug]}
          </h1>
        </header>

        <nav aria-label="Legal" className="mb-6 flex flex-wrap gap-2 sm:mb-8">
          {LEGAL_SLUGS.map((s) => (
            <Link
              key={s}
              href={`/${s}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition",
                s === slug
                  ? "border-white/35 bg-white/[0.08] text-white"
                  : "border-white/15 bg-white/[0.04] text-white/55 hover:border-white/30 hover:text-white/85",
              )}
            >
              {copy.nav[s]}
            </Link>
          ))}
          <Link
            href="/faq"
            className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 transition hover:border-white/30 hover:text-white/85"
          >
            {copy.nav.faq}
          </Link>
        </nav>

        <GlassPanel matte className="!rounded-2xl">
          <div className="relative px-4 py-5 sm:px-6 sm:py-6">
            <LegalMarkdown markdown={markdown} />
          </div>
        </GlassPanel>
      </main>
    </div>
  );
}
