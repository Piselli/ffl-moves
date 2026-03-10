"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { shortenAddress } from "@/lib/utils";

const navLinks = [
  { href: "/gameweek", label: "Склад" },
  { href: "/leaderboard", label: "Лідерборд" },
  { href: "/titles", label: "Титули" },
];

export function Navbar() {
  const { connected, account, connect, disconnect, wallets } = useWallet();
  const [showWalletList, setShowWalletList] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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

  const availableWallets = wallets?.filter((w) => w.readyState === "Installed") || [];

  const logoEl = (
    <Link href="/" className="flex items-center gap-2.5 group shrink-0">
      {/* Logo icon */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F0FF] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#00F0FF]/20 group-hover:shadow-[#00F0FF]/40 group-hover:scale-105 transition-all duration-300">
        <svg className="w-5 h-5 text-[#0D0F12]" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <span className="font-display font-black text-xl uppercase tracking-tighter text-white">
        FPL<span className="text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">MOVE</span>
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
                {/* Active glow dot */}
                <span
                  className={`mt-0.5 w-1 h-1 rounded-full transition-all duration-300 ${
                    isActive ? "bg-[#00F0FF] shadow-[0_0_6px_rgba(0,240,255,0.8)]" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        {/* ── Right: Wallet ────────────────────────────── */}
        <div className="relative flex items-center gap-3" ref={dropdownRef}>
          {connected && account ? (
            <div className="flex items-center gap-3">
              {/* Address pill */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
                <span className="text-xs text-[#00F0FF] font-black font-display uppercase tracking-wider">
                  {shortenAddress(account.address.toString())}
                </span>
              </div>
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
                className="relative group px-5 py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-wider text-white/90 bg-white/[0.05] border border-white/10 hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all duration-300 focus:outline-none"
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
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-2 group-hover:border-[#00F0FF]/40 transition-colors flex shrink-0 items-center justify-center">
                            {wallet.icon && (
                              <img src={wallet.icon} alt={wallet.name} className="w-full h-full object-contain" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-display font-bold text-white group-hover:text-[#00F0FF] transition-colors">
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
                          <a href="https://nightly.app" target="_blank" rel="noreferrer" className="text-[#00F0FF] hover:underline">
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
