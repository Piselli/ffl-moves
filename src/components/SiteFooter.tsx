"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SocialLinkX } from "@/components/SocialLinkX";
import { Form8Lockup } from "@/components/Form8Mark";
import { useSiteMessages } from "@/i18n/LocaleProvider";

const HIDE_FOOTER_EXACT = new Set([
  "/",
  "/leaderboard",
  "/season-leaderboard",
  "/faq",
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
  const pathname = usePathname();

  // Discreet shortcut to the referral dashboard — only shown to people who have
  // already signed into it on this device (the key is saved in localStorage).
  // Keeps the link invisible to regular visitors.
  const [showReferrals, setShowReferrals] = useState(false);
  useEffect(() => {
    try {
      setShowReferrals(!!localStorage.getItem("fflmove_ref_admin_key"));
    } catch {
      /* ignore */
    }
  }, []);

  if (shouldHideFooter(pathname)) return null;

  return (
    <footer className="relative z-0 border-t border-white/[0.06] bg-[#0A0C0F]/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <Link href="/" aria-label="FORM8" className="inline-flex items-center text-white/80 transition-colors hover:text-white">
            <Form8Lockup wordmarkClassName="text-white/80" />
          </Link>
          <p className="max-w-md text-sm leading-relaxed text-white/40">{m.footer.socialHint}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          <SocialLinkX ariaLabel={m.footer.socialAria} variant="inline" />
          <Link
            href="/faq"
            className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/65 transition-colors"
          >
            {m.nav.faq}
          </Link>
          {showReferrals && (
            <Link
              href="/admin/referrals"
              className="text-xs font-bold uppercase tracking-widest text-emerald-400/50 hover:text-emerald-400/90 transition-colors"
            >
              Referrals
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
