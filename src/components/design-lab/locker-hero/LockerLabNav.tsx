"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandLockup, BRAND_LOCKUP_NAV_INNER } from "@/components/BrandLockup";
import { useDeposit } from "@/components/DepositProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NavUsdcBalance } from "@/components/NavUsdcBalance";
import { NicknameModal } from "@/components/NicknameModal";
import { useLogin } from "@/components/LoginProvider";
import { useWallet } from "@/hooks/useSolanaWallet";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn, shortenAddress } from "@/lib/utils";
import { LOCKER_NAV_TALENTS_AFTER, primarySiteNavLinks } from "./navStyles";

type Props = {
  /** When true, nav links navigate (site). Lab keeps preventDefault for mock. */
  liveLinks?: boolean;
};

const CHIP =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4 text-xs font-bold uppercase leading-none tracking-wide sm:h-10 sm:px-5";

const MOBILE_CHIP =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-2.5 text-[10px] font-bold uppercase leading-none tracking-wide";

const NAV_LINK =
  "inline-flex h-9 items-center px-2.5 text-sm font-semibold uppercase leading-none tracking-[0.14em] text-white/90 transition-colors hover:text-[#00f948] sm:h-10";

export function LockerTalentsSoon({ className }: { className?: string }) {
  const m = useSiteMessages();
  return (
    <span
      className={cn(
        "relative inline-flex h-8 cursor-not-allowed select-none items-center px-2.5 pr-9 text-[13px] font-semibold uppercase leading-none tracking-[0.14em] text-white/30",
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
  const chip = compact ? MOBILE_CHIP : CHIP;

  return (
    <div className="relative z-10 flex min-w-0 items-center gap-1 sm:gap-1.5 md:gap-2">
      {connected ? (
        <>
          <NavUsdcBalance
            className={cn(compact && "h-7 max-w-[5.25rem] px-2 text-[10px] normal-case tracking-tight")}
          />
          <button
            type="button"
            onClick={openDeposit}
            className={cn(
              chip,
              "bg-[#00f948] text-black transition hover:brightness-110 active:scale-[0.98]",
              compact && "px-2",
            )}
          >
            <span className="md:hidden">+</span>
            <span className="hidden md:inline">{m.deposit.open}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (address) setShowNicknameModal(true);
            }}
            disabled={!address}
            title={myNickname ? m.nav.changeNickname : m.nav.setNickname}
            className={cn(
              chip,
              "hidden max-w-[7.5rem] truncate border border-white/20 bg-black/40 text-white/85 backdrop-blur-sm transition hover:border-white/35 active:scale-[0.98] disabled:opacity-50 md:inline-flex",
            )}
          >
            {myNickname ?? (address ? shortenAddress(address) : walletName ?? "…")}
          </button>
          <button
            type="button"
            onClick={() => disconnect()}
            title={m.nav.disconnect}
            className={cn(
              chip,
              "hidden text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98] md:inline-flex",
            )}
          >
            {m.nav.disconnectShort}
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
        <button
          type="button"
          id="wallet-connect-btn"
          onClick={openLogin}
          className={cn(
            chip,
            "bg-white text-black transition hover:bg-white/90 active:scale-[0.98]",
            compact && "px-3",
          )}
        >
          {m.nav.connectWallet}
        </button>
      )}
    </div>
  );
}

/**
 * Locked top menu — lit type: no bar, letters lit by room spots.
 * form8 left, actions right, links centered; locale sits in the top-right corner.
 */
export function LockerLabNav({ liveLinks = false }: Props) {
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.28)_55%,transparent_100%)]"
      />
      <div className="pointer-events-auto w-full">
        <div className={cn(BRAND_LOCKUP_NAV_INNER, "max-md:h-14 max-md:gap-2 max-md:px-3 sm:max-md:px-4")}>
          <div className="flex min-w-0 flex-1 items-center justify-start">
            <BrandLockup
              priority
              className="max-md:[&_span:last-child]:hidden max-md:gap-0"
              linkClassName="relative z-10 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
            />
          </div>
          <Links
            liveLinks={liveLinks}
            className="hidden shrink-0 md:flex"
            linkClassName={cn(
              "text-white",
              "drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]",
              "hover:text-[#00f948]",
            )}
          />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-1.5 md:gap-2">
            <div className="md:hidden">
              <LanguageSwitcher embedded />
            </div>
            <Right compact />
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? m.nav.menuClose : m.nav.menuOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/40 text-white transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.08] active:scale-[0.96]"
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
        </div>
      </div>
      <div className="pointer-events-auto absolute right-5 top-0 z-20 hidden h-[4.25rem] items-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] sm:right-8 sm:h-[4.5rem] md:flex lg:right-10">
        <LanguageSwitcher embedded />
      </div>

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
                className="mt-1 flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black transition hover:bg-white/90"
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
