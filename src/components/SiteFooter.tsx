"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SocialLinkX } from "@/components/SocialLinkX";
import { useSiteMessages } from "@/i18n/LocaleProvider";

export function SiteFooter() {
  const m = useSiteMessages();

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

  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-[#0A0C0F]/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-display font-black uppercase tracking-wider text-white/70">
            MOVEMATCH
          </p>
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
