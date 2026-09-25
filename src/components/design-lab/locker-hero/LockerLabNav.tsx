"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandLockup, BRAND_LOCKUP_NAV_INNER } from "@/components/BrandLockup";
import { SiteBackHomeFloat } from "@/components/SiteBackHome";
import { useDeposit } from "@/components/DepositProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NavUsdcBalance } from "@/components/NavUsdcBalance";
import { NicknameModal } from "@/components/NicknameModal";
import { useLogin } from "@/components/LoginProvider";
import { SocialLinkX } from "@/components/SocialLinkX";
import { useWallet } from "@/hooks/useSolanaWallet";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { SOCIAL_X_HANDLE, SOCIAL_X_URL } from "@/lib/constants";
import { isFirefoxBrowser } from "@/lib/browser";
import { cn, shortenAddress } from "@/lib/utils";
import {
  NAV_TRAY_BTN,
  navDepositCtaStyle,
  navWhiteCtaStyle,
} from "@/components/navUtilityStyles";
import { LOCKER_NAV_TALENTS_AFTER, primarySiteNavLinks } from "./navStyles";

type Props = {
  /** When true, nav links navigate (site). Lab keeps preventDefault for mock. */
  liveLinks?: boolean;
  /** Mobile flat tablet — solid bar, no room gradient. */
  tabletShell?: boolean;
};

const NAV_LINK =
  "inline-flex h-9 items-center px-1.5 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-white/90 transition-colors hover:text-[#00f948] sm:h-10 sm:px-2 lg:px-2.5 lg:text-sm lg:tracking-[0.14em]";

export function LockerTalentsSoon({ className }: { className?: string }) {
  const m = useSiteMessages();
  return (
    <span
      className={cn(
        "relative inline-flex h-8 cursor-not-allowed select-none items-center px-1.5 pr-8 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-white/30 sm:px-2 sm:pr-9 lg:text-[13px] lg:tracking-[0.14em]",
        className,
      )}
    >
      {m.nav.talents}
      <span className="absolute -top-1 right-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-1 py-0.5 text-[7px] font-bold uppercase leading-none tracking-wide text-amber-400/70">
        {m.nav.soon}
      </span>
    </span>
  );
}

function Links({
  className,
  linkClassName,
  liveLinks = false,
}: {
  className?: string;
  linkClassName?: string;
  liveLinks?: boolean;
}) {
  const m = useSiteMessages();
  const links = primarySiteNavLinks(m);
  const beforeTalents = links.slice(0, LOCKER_NAV_TALENTS_AFTER);
  const afterTalents = links.slice(LOCKER_NAV_TALENTS_AFTER);

  return (
    <nav className={cn("hidden items-center md:flex", className)}>
      {beforeTalents.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={liveLinks ? undefined : (e) => e.preventDefault()}
          className={cn(NAV_LINK, linkClassName)}
        >
          {link.label}
        </Link>
      ))}
      <LockerTalentsSoon className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]" />
      {afterTalents.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={liveLinks ? undefined : (e) => e.preventDefault()}
          className={cn(NAV_LINK, linkClassName)}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function Right({ compact = false }: { compact?: boolean }) {
  const m = useSiteMessages();
  const { connected, address, disconnect, walletName } = useWallet();
  const { openLogin } = useLogin();
  const { openDeposit } = useDeposit();
  const { setNickname, myNickname } = useNickname(address);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  return (
    <div className="relative z-10 flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
      {connected ? (
        <>
          {/* Phone: deposit always visible in the bar */}
          <button
            type="button"
            onClick={openDeposit}
            style={navDepositCtaStyle}
            className={cn(NAV_TRAY_BTN, "md:hidden", compact && "px-2.5 text-[10px]")}
          >
            {m.deposit.open}
          </button>
          {/* White bone balance · soft green deposit · live-dot nick */}
          <div className={cn("hidden items-center gap-1.5 md:inline-flex")}>
            <NavUsdcBalance
              variant="cluster"
              className={cn(compact && "max-w-[5.5rem]")}
            />
            <button
              type="button"
              onClick={openDeposit}
              style={navDepositCtaStyle}
              className={NAV_TRAY_BTN}
            >
              {m.deposit.open}
            </button>
            <button
              type="button"
              onClick={() => {
                if (address) setShowNicknameModal(true);
              }}
              disabled={!address}
              title={myNickname ? m.nav.changeNickname : m.nav.setNickname}
              className="inline-flex h-9 max-w-[8rem] items-center gap-1.5 truncate rounded-xl px-2.5 text-[11px] font-semibold leading-none tracking-tight text-white/85 transition hover:bg-white/[0.07] hover:text-white active:scale-[0.98] disabled:opacity-50"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f948] shadow-[0_0_6px_rgba(0,249,72,0.8)]" />
              <span className="truncate font-display text-[11px] font-black uppercase tracking-wider">
                {myNickname ?? (address ? shortenAddress(address) : walletName ?? "…")}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => disconnect()}
            title={m.nav.disconnect}
            aria-label={m.nav.disconnect}
            className="hidden h-9 w-9 place-items-center rounded-xl border border-white/12 bg-black/40 text-white/45 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white/80 active:scale-[0.97] md:grid"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1M3 12h11M10 8l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {address ? (
            <NicknameModal
              open={showNicknameModal}
              address={address}
              currentNickname={myNickname}
              onSave={(name) => {
                setNickname(address, name);
                setShowNicknameModal(false);
              }}
              onClose={() => setShowNicknameModal(false)}
            />
          ) : null}
        </>
      ) : (
        <div className="inline-flex items-center">
          <button
            type="button"
            id="wallet-connect-btn"
            onClick={openLogin}
            style={navWhiteCtaStyle}
            className={cn(NAV_TRAY_BTN, compact && "px-3")}
          >
            {m.nav.connectWallet}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Locked top menu — lit type: no bar, letters lit by room spots.
 *
 * Desktop: logo · equal spacer · links · equal spacer · utilities
 * inside a symmetric max-width row (same inset L/R as each other — aligns
 * with the centered tablet). FAQ + locale float in the viewport corner and
 * must NOT add extra padding that pulls utilities inward.
 */
export function LockerLabNav({ liveLinks = false, tabletShell = false }: Props) {
  const m = useSiteMessages();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() ?? false;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const { connected, address, disconnect, walletName } = useWallet();
  const { openDeposit, balanceLabel } = useDeposit();
  const { openLogin } = useLogin();
  const { setNickname, myNickname } = useNickname(address);
  const links = primarySiteNavLinks(m);
  const beforeTalents = links.slice(0, LOCKER_NAV_TALENTS_AFTER);
  const afterTalents = links.slice(LOCKER_NAV_TALENTS_AFTER);
  /**
   * Firefox: absolute FAQ + locale sits on top of Log in / X.
   * Keep them in the utilities row there; other browsers keep the float.
   * useLayoutEffect so SSR hydrate (false) flips before paint on Firefox.
   */
  const [firefoxNav, setFirefoxNav] = useState(false);
  useLayoutEffect(() => {
    setFirefoxNav(isFirefoxBrowser());
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onPointer(event: MouseEvent) {
      const t = event.target as Node;
      if (shellRef.current && !shellRef.current.contains(t)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [mobileOpen]);

  return (
    <div ref={shellRef} className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
      {!tabletShell ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.28)_55%,transparent_100%)] md:block"
        />
      ) : null}
      <div className="pointer-events-auto relative w-full">
        {/* —— Phone: menu · logo · login/deposit —— */}
        <div
          className={cn(
            "grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/10 px-3 backdrop-blur-xl md:hidden",
            tabletShell ? "bg-black" : "bg-black/95",
          )}
        >
          <div className="flex justify-start">
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? m.nav.menuClose : m.nav.menuOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className="relative z-20 inline-flex h-8 min-w-[4.75rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-3 text-white transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.08] active:scale-[0.96]"
            >
              {mobileOpen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <BrandLockup
            priority
            className="h-9 gap-2 [&_span:last-child]:text-[18px]/none"
            linkClassName="relative z-10 justify-self-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          />

          <Right compact />
        </div>

        {/* —— Desktop / tablet scene —— */}
        <div className="relative hidden md:block">
          <div
            className={cn(
              BRAND_LOCKUP_NAV_INNER,
              "!flex gap-0",
            )}
          >
            <BrandLockup
              priority
              className="max-md:h-9 max-md:gap-2.5 max-md:[&_span:last-child]:text-[18px]/none sm:max-md:[&_span:last-child]:text-[20px]/none"
              linkClassName="relative z-10 shrink-0 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
            />

            <div className="min-w-3 flex-1 sm:min-w-4" aria-hidden />

            <Links
              liveLinks={liveLinks}
              className="relative z-10 shrink-0"
              linkClassName={cn(
                "text-white",
                "drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]",
                "hover:text-[#00f948]",
              )}
            />

            <div className="min-w-3 flex-1 sm:min-w-4" aria-hidden />

            <div className="relative z-20 flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-2.5">
              <SocialLinkX
                ariaLabel={m.nav.socialXAria}
                variant="icon"
                className="!inline-flex !h-9 !w-9 !rounded-xl !border-white/12 !bg-black/40 !text-white/70 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] hover:!border-white/25 hover:!bg-white/[0.08] hover:!text-white"
              />
              <Right />
              {firefoxNav ? (
                <>
                  <Link
                    href="/faq"
                    onClick={liveLinks ? undefined : (e) => e.preventDefault()}
                    className="inline-flex h-8 items-center rounded-lg px-2 text-[10px] font-black uppercase tracking-wider text-white/55 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-colors hover:text-white sm:px-2.5 sm:text-[11px]"
                  >
                    {m.nav.faq}
                  </Link>
                  <LanguageSwitcher embedded />
                </>
              ) : null}
            </div>
          </div>

          {/* FAQ + locale — outside the content row so L/R insets stay equal */}
          {!firefoxNav ? (
            <div className="pointer-events-auto absolute right-3 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1.5 sm:right-4 sm:gap-2 lg:right-5">
              <Link
                href="/faq"
                onClick={liveLinks ? undefined : (e) => e.preventDefault()}
                className="inline-flex h-8 items-center rounded-lg px-2 text-[10px] font-black uppercase tracking-wider text-white/55 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-colors hover:text-white sm:px-2.5 sm:text-[11px]"
              >
                {m.nav.faq}
              </Link>
              <LanguageSwitcher embedded />
            </div>
          ) : null}
        </div>
      </div>

      {/* Flat phone shells already have Home in the menu + wordmark — float overlaps UI. */}
      {liveLinks && !tabletShell ? <SiteBackHomeFloat /> : null}

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="pointer-events-auto mx-3 origin-top overflow-hidden rounded-2xl border border-white/12 bg-[#0D0F12]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:mx-5 md:hidden"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { duration: 0.18, ease: [0.23, 1, 0.32, 1] }
            }
          >
            {liveLinks && pathname !== "/" ? (
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="mb-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {m.nav.backHome}
              </Link>
            ) : null}
            {beforeTalents.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    if (!liveLinks) e.preventDefault();
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-white/70 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  {link.label}
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00f948]" />
                  ) : null}
                </Link>
              );
            })}
            <div className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/25">
              <span className="relative pr-10">
                {m.nav.talents}
                <span className="absolute -top-1.5 right-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-1 py-0.5 text-[7px] font-bold uppercase leading-none tracking-wide text-amber-400/70">
                  {m.nav.soon}
                </span>
              </span>
            </div>
            {afterTalents.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    if (!liveLinks) e.preventDefault();
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-white/70 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  {link.label}
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00f948]" />
                  ) : null}
                </Link>
              );
            })}
            <a
              href={SOCIAL_X_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              aria-label={m.nav.socialXAria}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {SOCIAL_X_HANDLE}
              <span className="text-[10px] font-bold tracking-[0.14em] text-white/35">X</span>
            </a>
            <Link
              href="/faq"
              onClick={(e) => {
                if (!liveLinks) e.preventDefault();
                setMobileOpen(false);
              }}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {m.nav.faq}
            </Link>
            <div className="flex items-center justify-between rounded-xl px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                {m.nav.language}
              </span>
              <LanguageSwitcher embedded />
            </div>
            {connected ? (
              <>
                <div className="my-1 h-px bg-white/10" />
                <div className="flex items-center justify-between rounded-xl px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {m.deposit.balanceLabel}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-white">
                    {balanceLabel ?? "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    openDeposit();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#00f948] transition-colors hover:bg-white/[0.05]"
                >
                  {m.deposit.open}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (address) setShowNicknameModal(true);
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {myNickname ?? (address ? shortenAddress(address) : walletName ?? "…")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    disconnect();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-red-400/80 transition-colors hover:bg-red-500/10"
                >
                  {m.nav.disconnect}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  openLogin();
                  setMobileOpen(false);
                }}
                style={navWhiteCtaStyle}
                className={cn(NAV_TRAY_BTN, "mt-1 h-11 w-full rounded-xl text-sm tracking-[0.14em]")}
              >
                {m.nav.connectWallet}
              </button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {address ? (
        <NicknameModal
          open={showNicknameModal}
          address={address}
          currentNickname={myNickname}
          onSave={(name) => {
            setNickname(address, name);
            setShowNicknameModal(false);
          }}
          onClose={() => setShowNicknameModal(false)}
        />
      ) : null}
    </div>
  );
}
