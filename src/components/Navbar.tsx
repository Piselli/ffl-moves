"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { isWorldCupCampaignActive } from "@/lib/worldcup";
import { isWorldCupSurfaceVisible } from "@/lib/worldCupAccess";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useSolanaWallet";
import { shortenAddress } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";
import { NicknameModal } from "./NicknameModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NavUtilityCluster, NavUtilityDivider } from "@/components/NavUtilityCluster";
import { SocialLinkX, XLogo } from "@/components/SocialLinkX";
import { SOCIAL_X_URL } from "@/lib/constants";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { Form8Lockup } from "@/components/Form8Mark";
import { useDeposit } from "@/components/DepositProvider";
import { useLogin } from "@/components/LoginProvider";
import { NavUsdcBalance } from "@/components/NavUsdcBalance";
import { SPRING_PILL } from "@/lib/uiMotion";

const HIDE_NAV_PATHS = new Set([
  "/",
  "/leaderboard",
  "/season-leaderboard",
  "/design-preview/homepage",
  "/design-lab/locker-hero",
  "/design-lab/locker-leaderboard",
  "/design-lab/leaderboard-concepts",
]);

export function Navbar() {
  const m = useSiteMessages();
  const pathname = usePathname();
  const wcCampaign = isWorldCupCampaignActive();
  const wcSurface = isWorldCupSurfaceVisible();
  const navLinks = (wcCampaign
    ? [
        ...(wcSurface ? [{ href: "/world-cup", label: m.nav.worldCup, featured: true }] : []),
        ...(wcSurface
          ? [
              { href: "/world-cup/squad", label: m.nav.squad },
              { href: "/world-cup/fixtures", label: m.nav.fixtures },
              { href: "/world-cup/leaderboard", label: m.nav.leaderboard },
            ]
          : []),
        { href: "/season-leaderboard", label: m.nav.seasonPoints },
        { href: "/faq", label: m.nav.faq },
      ]
    : [
        { href: "/", label: m.nav.squad },
        { href: "/leaderboard", label: m.nav.leaderboard },
        { href: "/season-leaderboard", label: m.nav.seasonPoints },
        { href: "/fixtures", label: m.nav.fixtures },
        ...(wcSurface ? [{ href: "/world-cup", label: m.nav.worldCup }] : []),
        { href: "/faq", label: m.nav.faq },
      ]) as Array<{ href: string; label: string; featured?: boolean }>;
  const { connected, address, disconnect, walletName } = useWallet();
  const { openLogin } = useLogin();
  const { openDeposit } = useDeposit();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navShellRef = useRef<HTMLDivElement>(null);
  const cinematicHeroTop = wcCampaign && pathname === "/" && !scrolled;
  const { setNickname, hasNickname, myNickname } = useNickname(address);
  const hideNav = HIDE_NAV_PATHS.has(pathname);
  const reduceMotion = useReducedMotion() ?? false;

  // Auto-open nickname modal on first connection
  useEffect(() => {
    if (hideNav) return;
    if (connected && address && mounted && !hasNickname(address)) {
      const timer = setTimeout(() => setShowNicknameModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [hideNav, connected, address, mounted, hasNickname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hideNav) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hideNav]);

  useEffect(() => {
    if (hideNav) return;
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      if (navShellRef.current && !navShellRef.current.contains(t)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideNav]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (hideNav) return null;

  const logoEl = (
    <Link href="/" aria-label="FORM8" className="group shrink-0">
      <Form8Lockup
        priority
        className="transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03] group-active:scale-[0.97]"
      />
    </Link>
  );

  // Skeleton for SSR — mirror mobile row (menu + wallet) so layout does not jump at hydration
  if (!mounted) {
    return (
      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[min(100%,calc(100vw-1rem))] max-w-7xl px-2 sm:px-0">
        <nav className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="min-w-0 flex-1 md:flex-none">{logoEl}</div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 md:hidden">
            <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04]" aria-hidden />
            <div className="h-10 min-w-[5.5rem] rounded-xl border border-white/10 bg-white/[0.04]" aria-hidden />
          </div>
          <div className="hidden md:flex flex-1 justify-end items-center gap-3">
            <NavUtilityCluster>
              <LanguageSwitcher embedded />
              <NavUtilityDivider />
              <span className="px-2 py-1.5 text-[10px] font-semibold text-white/30">{m.nav.loading}</span>
            </NavUtilityCluster>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div
      ref={navShellRef}
      className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[min(100%,calc(100vw-1rem))] max-w-7xl px-2 sm:px-0 transition-all duration-500"
    >
      <nav
        className={`flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-3.5 rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          scrolled
            ? "bg-black/60 backdrop-blur-2xl border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            : cinematicHeroTop
              ? "bg-white/[0.04] backdrop-blur-2xl border-white/[0.07] shadow-[0_12px_48px_rgba(0,0,0,0.35)]"
              : "bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        }`}
      >
        {/* ── Left: Logo ──────────────────────────────── */}
        <div className="min-w-0 flex-1 md:flex-none">{logoEl}</div>

        {/* ── Center: Nav Links ───────────────────────── */}
        <LayoutGroup id="nav-links">
        <div className="hidden md:flex items-center gap-0.5 lg:gap-1 shrink-0">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href === "/world-cup"
                  ? pathname === "/world-cup"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const featured = "featured" in link && link.featured;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex flex-col items-center px-2.5 xl:px-3 py-2 rounded-lg group"
              >
                <span
                  className={`text-[11px] font-black tracking-widest uppercase transition-colors duration-150 ${
                    isActive
                      ? "text-white"
                      : featured
                        ? "text-[#00f948]/90 group-hover:text-[#00f948]"
                        : "text-white/40 group-hover:text-white/90"
                  }`}
                >
                  {link.label}
                </span>
                {isActive ? (
                  <motion.span
                    layoutId="nav-active"
                    className="mt-0.5 h-[2px] w-4 rounded-full bg-[#00f948]"
                    transition={reduceMotion ? { duration: 0 } : SPRING_PILL}
                  />
                ) : (
                  <span className="mt-0.5 h-[2px] w-4" />
                )}
              </Link>
            );
          })}
          {/* Таланти — coming soon, non-clickable */}
          <div className="relative flex flex-col items-center px-2.5 py-2 rounded-lg cursor-not-allowed select-none">
            <div className="relative">
              <span className="text-[11px] font-black tracking-widest uppercase text-white/20">
                {m.nav.talents}
              </span>
              <span className="absolute -top-2 -right-7 text-[7px] font-bold uppercase tracking-wide text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-full leading-none">
                {m.nav.soon}
              </span>
            </div>
            <span className="mt-0.5 h-[2px] w-4" />
          </div>
        </div>
        </LayoutGroup>

        {/* ── Nickname Modal ───────────────────────────── */}
        {address ? (
          <NicknameModal
            open={showNicknameModal}
            address={address}
            currentNickname={myNickname}
            onSave={(name) => setNickname(address, name)}
            onClose={() => setShowNicknameModal(false)}
          />
        ) : null}

        {/* ── Right: utility cluster + mobile menu + wallet ─────────── */}
        <div className="relative flex items-center gap-1.5 shrink-0 min-w-0">
          <NavUtilityCluster>
            <LanguageSwitcher embedded />
            <NavUtilityDivider />
            <SocialLinkX ariaLabel={m.nav.socialXAria} variant="cluster" />
            {connected ? (
              <>
                <NavUtilityDivider />
                <NavUsdcBalance variant="cluster" />
                <button
                  type="button"
                  onClick={openDeposit}
                  className="rounded-lg px-2.5 py-1.5 text-[10px] min-[400px]:text-[11px] font-display font-black uppercase tracking-wide text-[#00f948] transition-[background-color,transform] duration-150 hover:bg-[#00f948]/15 active:scale-[0.97] whitespace-nowrap"
                >
                  {m.deposit.open}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (address) setShowNicknameModal(true);
                  }}
                  disabled={!address}
                  className="inline-flex items-center gap-1.5 max-w-[7.5rem] min-[400px]:max-w-[8.5rem] lg:max-w-[9.5rem] xl:max-w-none min-w-0 rounded-lg px-2 py-1.5 transition-[background-color,transform] duration-150 hover:bg-white/[0.06] active:scale-[0.97] group disabled:opacity-50"
                  title={myNickname ? m.nav.changeNickname : m.nav.setNickname}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f948] animate-pulse shadow-[0_0_6px_rgba(0,249,72,0.8)] shrink-0" />
                  <span className="text-[10px] xl:text-[11px] text-[#00f948] font-black font-display uppercase tracking-wider truncate">
                    {myNickname ?? (address ? shortenAddress(address) : walletName ?? "…")}
                  </span>
                </button>
                <button
                  onClick={disconnect}
                  aria-label={m.nav.disconnect}
                  title={m.nav.disconnect}
                  className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-red-400/75 transition-[background-color,color,transform] duration-150 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.97] shrink-0"
                >
                  <span className="text-[10px] font-display font-bold uppercase tracking-wider">
                    {m.nav.disconnectShort}
                  </span>
                </button>
              </>
            ) : (
              <>
                <NavUtilityDivider />
                <button
                  id="wallet-connect-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openLogin();
                  }}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] min-[400px]:text-[11px] font-display font-black uppercase tracking-wide text-black transition-[background-color,transform] duration-150 hover:bg-white/90 active:scale-[0.97] whitespace-nowrap"
                >
                  <span className="min-[400px]:hidden">{m.nav.walletShort}</span>
                  <span className="hidden min-[400px]:inline">{m.nav.connectWallet}</span>
                </button>
              </>
            )}
          </NavUtilityCluster>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? m.nav.menuClose : m.nav.menuOpen}
            onClick={() => {
              setMobileMenuOpen((o) => !o);
            }}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-[background-color,transform] duration-150 active:scale-[0.96]"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
      {mobileMenuOpen ? (
        <motion.div
          className="md:hidden mt-2 origin-top overflow-hidden rounded-2xl border border-white/10 bg-[#0D0F12]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl space-y-0.5"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
          transition={reduceMotion ? { duration: 0.12 } : { duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href === "/world-cup"
                  ? pathname === "/world-cup"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const featured = "featured" in link && link.featured;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-display font-black uppercase tracking-widest transition-colors ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : featured
                      ? "text-[#00f948]/80 hover:bg-white/[0.05]"
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {link.label}
                {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-[#00f948] shadow-[0_0_8px_rgba(0,249,72,0.8)]" /> : null}
              </Link>
            );
          })}
          <div className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-display font-black uppercase tracking-widest text-white/25 cursor-not-allowed select-none">
            <span className="relative">
              {m.nav.talents}
              <span className="absolute -top-1.5 -right-12 text-[7px] font-bold uppercase tracking-wide text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-full leading-none">
                {m.nav.soon}
              </span>
            </span>
          </div>
          <div className="mt-1 border-t border-white/[0.06] pt-1 px-1">
            <a
              href={SOCIAL_X_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={m.nav.socialXAria}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-display font-black uppercase tracking-widest text-white/70 bg-[#00f948]/[0.06] border border-[#00f948]/20 hover:bg-[#00f948]/10 hover:text-white transition-colors"
            >
              <span className="flex min-w-0 flex-col gap-0.5 normal-case tracking-normal">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#00f948]/80">
                  {m.communityStrip.badge}
                </span>
                <span className="truncate text-xs font-semibold text-white/80">{m.footer.socialHintShort}</span>
              </span>
              <XLogo className="h-4 w-4 shrink-0 opacity-70" />
            </a>
          </div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
  );
}
