"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SocialLinkX } from "@/components/SocialLinkX";
import { Form8Lockup } from "@/components/Form8Mark";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { SOCIAL_TG_HANDLE, SOCIAL_TG_URL } from "@/lib/constants";

const HIDE_FOOTER_EXACT = new Set([
  "/",
  "/leaderboard",
  "/season-leaderboard",
  "/faq",
  "/terms",
  "/privacy",
  "/risk",
  "/cookies",
  "/fixtures",
  "/my-result",
  "/admin",
  "/admin/referrals",
  "/design-lab/locker-hero",
  "/design-lab/locker-leaderboard",
  "/design-lab/leaderboard-concepts",
  "/design-lab/desk-results",
  "/design-preview/homepage",
]);

const HIDE_FOOTER_PREFIXES = [
  "/leaderboard/",
  "/season-leaderboard/",
  "/design-lab/desk-results/",
  "/design-lab/locker-leaderboard/",
] as const;

function shouldHideFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  if (HIDE_FOOTER_EXACT.has(pathname)) return true;
  return HIDE_FOOTER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function SiteFooter() {
  const m = useSiteMessages();
  const { locale } = useSiteLocale();
  const pathname = usePathname();
  const uk = locale === "uk";

  const [showReferrals, setShowReferrals] = useState(false);
  useEffect(() => {
    try {
      setShowReferrals(!!localStorage.getItem("fflmove_ref_admin_key"));
    } catch {
      /* ignore */
    }
  }, []);

  if (shouldHideFooter(pathname)) return null;

  const legalLinks = [
    { href: "/terms", label: uk ? "Умови" : "Terms" },
    { href: "/privacy", label: uk ? "Конфіденційність" : "Privacy" },
    { href: "/risk", label: uk ? "Ризики" : "Risk Disclosure" },
    { href: "/cookies", label: uk ? "Cookie" : "Cookies" },
    { href: "/faq", label: "FAQ" },
  ] as const;

  return (
    <footer className="relative z-0 border-t border-white/[0.06] bg-[#0A0C0F]/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <Link
              href="/"
              aria-label="FORM8"
              className="inline-flex items-center text-white/80 transition-colors hover:text-white"
            >
              <Form8Lockup wordmarkClassName="text-white/80" />
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-white/40">
              {m.footer.socialHint}
            </p>
            <p className="max-w-xl text-[11px] leading-relaxed text-white/30">
              {uk
                ? "Не пов'язано з Прем'єр-лігою, Fantasy Premier League чи будь-яким клубом. 18+ (21+ де вимагається). Грайте відповідально."
                : "Not affiliated with the Premier League, Fantasy Premier League or any club. 18+ (21+ where required). Play responsibly."}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-4 sm:justify-end sm:gap-5">
              <SocialLinkX ariaLabel={m.footer.socialAria} variant="inline" />
              <a
                href={SOCIAL_TG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold uppercase tracking-widest text-white/30 transition-colors hover:text-white/65"
              >
                {SOCIAL_TG_HANDLE}
              </a>
              {showReferrals && (
                <Link
                  href="/admin/referrals"
                  className="text-xs font-bold uppercase tracking-widest text-emerald-400/50 transition-colors hover:text-emerald-400/90"
                >
                  Referrals
                </Link>
              )}
            </div>
            <nav
              aria-label="Legal"
              className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end"
            >
              {legalLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[10px] font-bold uppercase tracking-widest text-white/25 transition-colors hover:text-white/60"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
