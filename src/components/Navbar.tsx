"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { shortenAddress } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";
import { NicknameModal } from "./NicknameModal";

const navLinks = [
  { href: "/gameweek", label: "Склад" },
  { href: "/leaderboard", label: "Лідерборд" },
  { href: "/fixtures", label: "Матчі" },
];

export function Navbar() {
  const { connected, account, connect, disconnect, wallets } = useWallet();
  const [showWalletList, setShowWalletList] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const address = account?.address?.toString() ?? null;
  const { getNickname, setNickname, hasNickname, myNickname } = useNickname(address);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWalletList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnectWallet = async (walletName: string) => {
    try {
      await connect(walletName as any);
      setShowWalletList(false);
    } catch (e) {
      console.error("Failed to connect:", e);
    }
  };

  const availableWallets = wallets?.filter((w) => w.readyState === "Installed" && w.name === "Nightly") || [];

  const logoEl = (
    <Link href="/" className="flex items-center gap-2.5 group shrink-0">
      {/* Logo icon */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00C46A] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#00C46A]/20 group-hover:shadow-[#00C46A]/40 group-hover:scale-105 transition-all duration-300">
        <svg className="w-5 h-5 text-[#0D0F12]" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <span className="font-display font-black text-xl uppercase tracking-tighter text-white">
        FPL<span className="text-[#00C46A] drop-shadow-[0_0_8px_rgba(0,196,106,0.6)]">MOVE</span>
      </span>
    </Link>
  );

  // Skeleton for SSR
  if (!mounted) {
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl">
        <nav className="flex items-center justify-between px-6 py-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {logoEl}
          <div className="px-5 py-2 rounded-xl border border-white/10 text-xs font-semibold bg-white/5 text-white/30">
            Loading...
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl transition-all duration-500">
      <nav
        className={`flex items-center justify-between px-6 py-3.5 rounded-2xl border transition-all duration-500 ${
          scrolled
            ? "bg-black/60 backdrop-blur-2xl border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            : "bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        }`}
      >
        {/* ── Left: Logo ──────────────────────────────── */}
        {logoEl}

        {/* ── Center: Nav Links ───────────────────────── */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex flex-col items-center px-4 py-2 rounded-lg group"
              >
                <span
                  className={`text-[11px] font-black tracking-widest uppercase transition-all duration-200 ${
                    isActive
                      ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                      : "text-white/40 group-hover:text-white/90"
                  }`}
                >
                  {link.label}
                </span>
                <span
                  className={`mt-0.5 w-1 h-1 rounded-full transition-all duration-300 ${
                    isActive ? "bg-[#00C46A] shadow-[0_0_6px_rgba(0,196,106,0.8)]" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
          {/* Таланти — coming soon, non-clickable */}
          <div className="relative flex flex-col items-center px-4 py-2 rounded-lg cursor-not-allowed select-none">
            <div className="relative">
              <span className="text-[11px] font-black tracking-widest uppercase text-white/20">
                Таланти
              </span>
              <span className="absolute -top-2 -right-7 text-[7px] font-bold uppercase tracking-wide text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-full leading-none">
                soon
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

        {/* ── Right: Wallet ────────────────────────────── */}
        <div className="relative flex items-center gap-3" ref={dropdownRef}>
          {connected && account ? (
            <div className="flex items-center gap-3">
              {/* Nickname / address pill — click to edit */}
              <button
                onClick={() => setShowNicknameModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 hover:border-[#00C46A]/40 hover:bg-white/[0.08] transition-all duration-200 group"
                title={myNickname ? "Змінити нікнейм" : "Встановити нікнейм"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A] animate-pulse shadow-[0_0_6px_rgba(0,196,106,0.8)]" />
                <span className="text-xs text-[#00C46A] font-black font-display uppercase tracking-wider">
                  {myNickname ?? shortenAddress(account.address.toString())}
                </span>
                {/* Edit icon */}
                <svg className="w-3 h-3 text-white/20 group-hover:text-[#00C46A]/60 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              {/* Disconnect */}
              <button
                onClick={disconnect}
                className="px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider border border-red-500/20 text-red-400/70 hover:border-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
              >
                Від'єднати
              </button>
            </div>
          ) : (
            <>
              {/* Connect button */}
              <button
                id="wallet-connect-btn"
                onClick={() => setShowWalletList(!showWalletList)}
                className="relative group px-5 py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-wider text-[#00C46A] bg-[#00C46A]/10 border border-[#00C46A]/30 hover:border-[#00C46A]/60 hover:bg-[#00C46A]/20 hover:shadow-[0_0_20px_rgba(0,196,106,0.4)] transition-all duration-300 focus:outline-none"
              >
                Підключити гаманець
              </button>

              {/* Wallet dropdown */}
              {showWalletList && (
                <div className="absolute right-0 top-full mt-4 w-72 rounded-2xl bg-[#0D0F12]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
                    <p className="text-sm font-display font-black uppercase tracking-wider text-white">
                      Обери гаманець
                    </p>
                    <p className="text-xs text-white/40 mt-1">Сумісний з Movement Network</p>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {availableWallets.length > 0 ? (
                      availableWallets.map((wallet) => (
                        <button
                          key={wallet.name}
                          onClick={() => handleConnectWallet(wallet.name)}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-2 group-hover:border-[#00C46A]/40 transition-colors flex shrink-0 items-center justify-center">
                            {wallet.icon && (
                              <img src={wallet.icon} alt={wallet.name} className="w-full h-full object-contain" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-display font-bold text-white group-hover:text-[#00C46A] transition-colors">
                              {wallet.name}
                            </p>
                            <p className="text-xs text-[#00e676] font-bold uppercase tracking-wider mt-0.5">
                              Встановлено
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <span className="text-3xl block mb-3">🔌</span>
                        <p className="text-sm font-bold text-white mb-1">Гаманців не знайдено</p>
                        <p className="text-xs text-white/40 leading-relaxed">
                          Встанови{" "}
                          <a href="https://nightly.app" target="_blank" rel="noreferrer" className="text-[#00C46A] hover:underline">
                            Nightly
                          </a>{" "}
                          або інший гаманець Movement.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
