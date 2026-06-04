"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { isWorldCupCampaignActive } from "@/lib/worldcup";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { shortenAddress } from "@/lib/utils";
import { nightlyConnectRows } from "@/lib/walletNightly";
import { WalletOnboardingLinks } from "@/components/WalletOnboardingLinks";
import { useNickname } from "@/hooks/useNickname";
import { NicknameModal } from "./NicknameModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NavUtilityCluster, NavUtilityDivider } from "@/components/NavUtilityCluster";
import { SocialLinkX, XLogo } from "@/components/SocialLinkX";
import { SOCIAL_X_URL } from "@/lib/constants";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";

export function Navbar() {
  const m = useSiteMessages();
  const { locale } = useSiteLocale();
  const wcCampaign = isWorldCupCampaignActive();
  const navLinks = wcCampaign
    ? [
        { href: "/world-cup", label: m.nav.worldCup, featured: true },
        { href: "/world-cup/squad", label: m.nav.squad },
        { href: "/world-cup/fixtures", label: m.nav.fixtures },
        { href: "/world-cup/leaderboard", label: m.nav.leaderboard },
        { href: "/faq", label: m.nav.faq },
      ]
    : [
        { href: "/gameweek", label: m.nav.squad },
        { href: "/leaderboard", label: m.nav.leaderboard },
        { href: "/fixtures", label: m.nav.fixtures },
        { href: "/world-cup", label: m.nav.worldCup },
        { href: "/faq", label: m.nav.faq },
      ];
  const { connected, account, connect, disconnect, wallets, notDetectedWallets } = useWallet();
  const [showWalletList, setShowWalletList] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [connectHint, setConnectHint] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navShellRef = useRef<HTMLDivElement>(null);
  const connectedRef = useRef(false);
  const connectHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const cinematicHeroTop = wcCampaign && pathname === "/" && !scrolled;

  const address = account?.address?.toString() ?? null;
  const { setNickname, hasNickname, myNickname } = useNickname(address);
  connectedRef.current = connected;

  // Auto-open nickname modal on first connection
  useEffect(() => {
    if (connected && address && mounted && !hasNickname(address)) {
      const timer = setTimeout(() => setShowNicknameModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [connected, address, mounted, hasNickname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(
    () => () => {
      if (connectHintTimerRef.current) {
        clearTimeout(connectHintTimerRef.current);
        connectHintTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(t)) {
        setShowWalletList(false);
      }
      if (navShellRef.current && !navShellRef.current.contains(t)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!connected) return;
    if (connectHintTimerRef.current) {
      clearTimeout(connectHintTimerRef.current);
      connectHintTimerRef.current = null;
    }
    setConnectHint(null);
    setShowWalletList(false);
  }, [connected]);

  const handleConnectWallet = async (walletName: string) => {
    setConnectHint(null);
    if (connectHintTimerRef.current) {
      clearTimeout(connectHintTimerRef.current);
      connectHintTimerRef.current = null;
    }
    try {
      // wallet-adapter types `connect` as `void`, but the runtime returns a Promise that may reject
      // (e.g. user closed Nightly) — await so the catch below actually handles cancellation hints.
      await connect(walletName);
      connectHintTimerRef.current = setTimeout(() => {
        connectHintTimerRef.current = null;
        if (!connectedRef.current) {
          setConnectHint(m.nav.connectHintNightly);
        }
      }, 2200);
    } catch (e) {
      console.error("Failed to connect:", e);
      setConnectHint(m.nav.connectHintFailed);
    }
  };

  const nightlyRows = nightlyConnectRows(wallets, notDetectedWallets);

  const logoEl = (
    <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5 group shrink">
      <Image
        src="/logo.png"
        alt="MoveMatch"
        width={235}
        height={150}
        className="shrink-0 group-hover:scale-105 transition-transform duration-300 h-8 w-auto sm:h-10"
        priority
      />
      <span className="font-display font-black text-base sm:text-xl uppercase tracking-tighter text-white truncate">
        MOVE<span className="text-[#00f948]">MATCH</span>
      </span>
    </Link>
  );

  // Skeleton for SSR — mirror mobile row (menu + wallet) so layout does not jump at hydration
  if (!mounted) {
    return (
      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[min(100%,calc(100vw-1rem))] max-w-6xl px-2 sm:px-0">
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
      className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[min(100%,calc(100vw-1rem))] max-w-6xl px-2 sm:px-0 transition-all duration-500"
    >
      <nav
        className={`flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-3.5 rounded-2xl border transition-all duration-500 ${
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
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/world-cup"
                ? pathname === "/world-cup"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const featured = "featured" in link && link.featured;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex flex-col items-center px-3 xl:px-4 py-2 rounded-lg group"
              >
                <span
                  className={`text-[11px] font-black tracking-widest uppercase transition-all duration-200 ${
                    isActive
                      ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                      : featured
                        ? "text-[#00f948]/90 group-hover:text-[#00f948]"
                        : "text-white/40 group-hover:text-white/90"
                  }`}
                >
                  {link.label}
                </span>
                <span
                  className={`mt-0.5 w-1 h-1 rounded-full transition-all duration-300 ${
                    isActive ? "bg-[#00f948] shadow-[0_0_6px_rgba(0,249,72,0.8)]" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
          {/* Таланти — coming soon, non-clickable */}
          <div className="relative flex flex-col items-center px-4 py-2 rounded-lg cursor-not-allowed select-none">
            <div className="relative">
              <span className="text-[11px] font-black tracking-widest uppercase text-white/20">
                {m.nav.talents}
              </span>
              <span className="absolute -top-2 -right-7 text-[7px] font-bold uppercase tracking-wide text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-full leading-none">
                {m.nav.soon}
              </span>
            </div>
            <span className="mt-0.5 w-1 h-1 rounded-full bg-transparent" />
          </div>
        </div>

        {/* ── Nickname Modal ───────────────────────────── */}
        {showNicknameModal && address && (
          <NicknameModal
            address={address}
            currentNickname={myNickname}
            onSave={(name) => setNickname(address, name)}
            onClose={() => setShowNicknameModal(false)}
          />
        )}

        {/* ── Right: utility cluster + mobile menu + wallet ─────────── */}
        <div className="relative flex items-center gap-1.5 shrink-0 min-w-0" ref={dropdownRef}>
          <NavUtilityCluster>
            <LanguageSwitcher embedded />
            <NavUtilityDivider />
            <SocialLinkX ariaLabel={m.nav.socialXAria} variant="cluster" />
            {connected && account ? (
              <>
                <NavUtilityDivider />
                <button
                  onClick={() => setShowNicknameModal(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 max-w-[8.5rem] lg:max-w-[9.5rem] xl:max-w-none min-w-0 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06] group"
                  title={myNickname ? m.nav.changeNickname : m.nav.setNickname}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f948] animate-pulse shadow-[0_0_6px_rgba(0,249,72,0.8)] shrink-0" />
                  <span className="text-[10px] xl:text-[11px] text-[#00f948] font-black font-display uppercase tracking-wider truncate">
                    {myNickname ?? shortenAddress(account.address.toString())}
                  </span>
                </button>
                <button
                  onClick={disconnect}
                  aria-label={m.nav.disconnect}
                  title={m.nav.disconnect}
                  className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-red-400/75 transition-colors hover:bg-red-500/10 hover:text-red-400 shrink-0"
                >
                  <span className="xl:hidden text-[10px] font-display font-bold uppercase tracking-wider">
                    {m.nav.disconnectShort}
                  </span>
                  <span className="hidden xl:inline text-[10px] font-display font-bold uppercase tracking-wider">
                    {m.nav.disconnect}
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
                    setConnectHint(null);
                    if (connectHintTimerRef.current) {
                      clearTimeout(connectHintTimerRef.current);
                      connectHintTimerRef.current = null;
                    }
                    setShowWalletList(!showWalletList);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-[10px] min-[400px]:text-[11px] font-display font-black uppercase tracking-wide text-[#00f948] transition-colors hover:bg-[#00f948]/15 whitespace-nowrap"
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
              setShowWalletList(false);
            }}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
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
          {showWalletList && !connected ? (
                <div className="absolute right-0 top-full z-[60] mt-3 sm:mt-4 w-[min(18rem,calc(100vw-2rem))] sm:w-72 rounded-2xl bg-[#0D0F12]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
                    <p className="text-sm font-display font-black uppercase tracking-wider text-white">
                      {m.nav.chooseWallet}
                    </p>
                    <p className="text-xs text-white/40 mt-1">{m.nav.compatibleMovement}</p>
                  </div>
                  <div className="p-2 max-h-[min(70vh,28rem)] overflow-y-auto">
                    {connectHint ? (
                      <div className="px-3 py-3 mb-1 rounded-xl bg-amber-500/10 border border-amber-500/25">
                        <p className="text-[11px] text-amber-100/90 leading-relaxed">{connectHint}</p>
                      </div>
                    ) : null}
                    {nightlyRows.length > 0 ? (
                      <>
                        {nightlyRows.map((row) => (
                          <button
                            key={row.name + row.mode}
                            type="button"
                            onClick={() => handleConnectWallet(row.name)}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-colors text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-2 group-hover:border-[#00f948]/40 transition-colors flex shrink-0 items-center justify-center">
                              {row.icon ? (
                                <img src={row.icon} alt={row.name} className="w-full h-full object-contain" />
                              ) : null}
                            </div>
                            <div>
                              <p className="text-sm font-display font-bold text-white group-hover:text-[#00f948] transition-colors">
                                {row.name}
                              </p>
                              <p className="text-xs text-[#00f948] font-bold uppercase tracking-wider mt-0.5">
                                {row.mode === "installed" ? m.nav.installed : m.nav.openInNightly}
                              </p>
                            </div>
                          </button>
                        ))}
                        {nightlyRows.some((r) => r.mode === "app") ? (
                          <div className="px-3 pb-2 pt-2 border-t border-white/[0.06] mt-1">
                            <WalletOnboardingLinks locale={locale} />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <span className="text-3xl block mb-3">🔌</span>
                        <p className="text-sm font-bold text-white mb-1">{m.nav.noWalletsFound}</p>
                        <p className="text-xs text-white/45 leading-relaxed mb-4">
                          {m.nav.noWalletsHint}
                        </p>
                        <WalletOnboardingLinks locale={locale} />
                      </div>
                    )}
                    {connectHint && nightlyRows.length > 0 && !nightlyRows.some((r) => r.mode === "app") ? (
                      <div className="px-3 pb-2 pt-2 border-t border-white/[0.06]">
                        <WalletOnboardingLinks locale={locale} />
                      </div>
                    ) : null}
                  </div>
                </div>
          ) : null}
        </div>
      </nav>

      {mobileMenuOpen ? (
        <div className="md:hidden mt-2 rounded-2xl border border-white/10 bg-[#0D0F12]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden p-2 space-y-0.5">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/world-cup"
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
        </div>
      ) : null}
    </div>
  );
}
