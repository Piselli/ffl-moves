"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Form8Mark, Form8Wordmark } from "@/components/Form8Mark";
import { LOCKER_NAV_LINKS } from "@/components/design-lab/locker-hero/navStyles";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NicknameModal } from "@/components/NicknameModal";
import { WalletConnectRows } from "@/components/WalletConnectRows";
import { useNickname } from "@/hooks/useNickname";
import { useWallet } from "@/hooks/useSolanaWallet";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn, shortenAddress } from "@/lib/utils";

/**
 * Site chrome for spatial results room — same brand continuity as homepage,
 * real wallet + locale (not lab fake Connect).
 */
export function ResultsPlaceNav() {
  const pathname = usePathname();
  const m = useSiteMessages();
  const { connected, account, disconnect } = useWallet();
  const { walletRows, connectWallet, lastError, hint, scanDone } =
    useWalletConnect();
  const address = account?.address?.toString() ?? null;
  const { setNickname, hasNickname, myNickname } = useNickname(address);
  const [showWalletList, setShowWalletList] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (connected && address && mounted && !hasNickname(address)) {
      const t = setTimeout(() => setShowNicknameModal(true), 600);
      return () => clearTimeout(t);
    }
  }, [connected, address, mounted, hasNickname]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowWalletList(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (connected) setShowWalletList(false);
  }, [connected]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.28)_55%,transparent_100%)]"
        />
        <div className="pointer-events-auto relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            <Form8Mark className="h-7 sm:h-8" priority />
            <Form8Wordmark className="truncate text-sm text-white sm:text-[15px]" />
          </Link>

          <nav className="hidden items-center md:flex">
            {LOCKER_NAV_LINKS.map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-2.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors",
                    "drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]",
                    active
                      ? "text-[#00f948]"
                      : "text-white hover:text-[#00f948]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <nav className="flex max-w-[42vw] items-center gap-0.5 overflow-x-auto md:hidden">
            {LOCKER_NAV_LINKS.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]",
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "text-[#00f948]"
                    : "text-white/70",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="relative flex items-center gap-2" ref={dropdownRef}>
            <LanguageSwitcher embedded />
            {connected && address ? (
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white/85 backdrop-blur-sm transition hover:border-white/35"
                title={myNickname ?? address}
              >
                {myNickname
                  ? myNickname.slice(0, 12)
                  : shortenAddress(address)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowWalletList((v) => !v)}
                className="rounded-lg border border-[#00f948]/50 bg-[#00f948]/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#00f948] shadow-[0_0_24px_rgba(0,249,72,0.25)] backdrop-blur-sm transition hover:bg-[#00f948]/30 active:scale-[0.98]"
              >
                {m.nav.connectWallet}
              </button>
            )}

            {showWalletList && !connected ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-white/15 bg-[#0e0d0c]/96 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl">
                {!scanDone ? (
                  <p className="px-2 py-3 text-[11px] text-white/45">
                    {m.nav.loading}
                  </p>
                ) : (
                  <WalletConnectRows
                    rows={walletRows}
                    onConnect={connectWallet}
                    variant="navbar"
                  />
                )}
                {(hint || lastError) && (
                  <p className="mt-2 px-2 text-[10px] leading-snug text-amber-200/80">
                    {hint || lastError}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showNicknameModal && address ? (
        <NicknameModal
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
  );
}

export function SquadStrip({
  squad,
  className,
}: {
  squad?: readonly string[];
  className?: string;
}) {
  if (!squad?.length) return null;
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1", className)}>
      {squad.slice(0, 11).map((name, i) => (
        <div
          key={`${name}-${i}`}
          className="flex h-[4.25rem] w-[3.35rem] shrink-0 flex-col items-center justify-end rounded-[2px] border border-white/12 bg-[#1a1714] px-1 pb-1.5 pt-2"
        >
          <span className="mb-1 font-display text-[8px] font-bold tabular-nums text-white/25">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-center font-display text-[9px] font-black uppercase leading-tight tracking-wide">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
