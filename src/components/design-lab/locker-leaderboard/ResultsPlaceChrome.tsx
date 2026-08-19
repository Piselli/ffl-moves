"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Form8Lockup } from "@/components/Form8Mark";
import { LOCKER_NAV_LINKS } from "@/components/design-lab/locker-hero/navStyles";
import { LockerTalentsSoon } from "@/components/design-lab/locker-hero/LockerLabNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NicknameModal } from "@/components/NicknameModal";
import { NavUsdcBalance } from "@/components/NavUsdcBalance";
import { useDeposit } from "@/components/DepositProvider";
import { useLogin } from "@/components/LoginProvider";
import { useNickname } from "@/hooks/useNickname";
import { useWallet } from "@/hooks/useSolanaWallet";
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
  const { openLogin } = useLogin();
  const { openDeposit } = useDeposit();
  const address = account?.address?.toString() ?? null;
  const { setNickname, hasNickname, myNickname } = useNickname(address);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (connected && address && mounted && !hasNickname(address)) {
      const t = setTimeout(() => setShowNicknameModal(true), 600);
      return () => clearTimeout(t);
    }
  }, [connected, address, mounted, hasNickname]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.28)_55%,transparent_100%)]"
        />
        <div className="pointer-events-auto relative flex h-16 w-full items-center px-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            aria-label="FORM8"
            className="relative z-10 flex shrink-0 items-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          >
            <Form8Lockup priority />
          </Link>

          <nav className="mx-4 hidden flex-1 items-center justify-center md:flex min-[1400px]:absolute min-[1400px]:left-1/2 min-[1400px]:top-1/2 min-[1400px]:mx-0 min-[1400px]:flex-none min-[1400px]:-translate-x-1/2 min-[1400px]:-translate-y-1/2">
            {LOCKER_NAV_LINKS.slice(0, 2).map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex h-8 items-center px-2.5 text-[13px] font-semibold uppercase leading-none tracking-[0.14em] transition-colors",
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
            <LockerTalentsSoon className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]" />
            {LOCKER_NAV_LINKS.slice(2).map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex h-8 items-center px-2.5 text-[13px] font-semibold uppercase leading-none tracking-[0.14em] transition-colors",
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

          <nav className="relative z-10 ml-2 flex max-w-[42vw] items-center gap-0.5 overflow-x-auto md:hidden">
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

          <div className="relative z-10 ml-auto flex h-8 min-w-0 items-center gap-1.5">
            <LanguageSwitcher embedded />
            {connected && address ? (
              <>
                <NavUsdcBalance />
                <button
                  type="button"
                  onClick={openDeposit}
                  className="inline-flex h-8 items-center rounded-lg bg-[#00f948] px-3 text-[11px] font-bold uppercase leading-none tracking-wide text-black transition hover:brightness-110 active:scale-[0.98]"
                >
                  {m.deposit.open}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNicknameModal(true)}
                  className="inline-flex h-8 max-w-[7.5rem] items-center truncate rounded-lg border border-white/20 bg-black/40 px-3 text-[11px] font-bold uppercase leading-none tracking-wide text-white/85 backdrop-blur-sm transition hover:border-white/35"
                  title={myNickname ? m.nav.changeNickname : m.nav.setNickname}
                >
                  {myNickname ?? shortenAddress(address)}
                </button>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-[11px] font-bold uppercase leading-none tracking-wide text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400"
                  title={m.nav.disconnect}
                >
                  {m.nav.disconnectShort}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[11px] font-bold uppercase leading-none tracking-wide text-black transition hover:bg-white/90 active:scale-[0.98]"
              >
                {m.nav.connectWallet}
              </button>
            )}
          </div>
        </div>
      </div>

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
