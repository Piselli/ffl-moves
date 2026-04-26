"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { shortenAddress } from "@/lib/utils";
import { nightlyConnectRows } from "@/lib/walletNightly";
import { WalletOnboardingLinks } from "@/components/WalletOnboardingLinks";

export function Sidebar() {
  const pathname = usePathname();
  const { connected, account, connect, disconnect, wallets, notDetectedWallets } = useWallet();
  const [showWalletList, setShowWalletList] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [connectHint, setConnectHint] = React.useState<string | null>(null);
  const connectedRef = React.useRef(false);
  const connectHintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(
    () => () => {
      if (connectHintTimerRef.current) {
        clearTimeout(connectHintTimerRef.current);
        connectHintTimerRef.current = null;
      }
    },
    [],
  );

  connectedRef.current = connected;

  React.useEffect(() => {
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
      await connect(walletName as any);
      connectHintTimerRef.current = setTimeout(() => {
        connectHintTimerRef.current = null;
        if (!connectedRef.current) {
          setConnectHint(
            "Nightly did not open or is not installed. Install the extension or app, or open this site in Nightly's in-app browser, then try Connect again.",
          );
        }
      }, 2200);
    } catch (e) {
      console.error("Failed to connect:", e);
      setConnectHint("Could not connect. Check that Nightly is installed, or use the links below.");
    }
  };

  const nightlyRows = nightlyConnectRows(wallets, notDetectedWallets);

  const navItems = [
    { name: "Command Center", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "My Squad", href: "/gameweek", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { name: "Titles (NFTs)", href: "/titles", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
    { name: "Leaderboard", href: "/leaderboard", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  ];

  if (!mounted) return <aside className="w-64 hidden lg:flex flex-col border-r border-white/5 bg-fpl-navy/80 shrink-0"></aside>;

  return (
    <aside className="w-64 hidden lg:flex flex-col border-r border-white/10 bg-fpl-navy/80 backdrop-blur-3xl shrink-0 h-screen sticky top-0">
      {/* Brand */}
      <div className="h-24 flex items-center px-8 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fpl-cyan to-blue-600 flex items-center justify-center shadow-lg shadow-fpl-cyan/20 group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-fpl-navy" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span className="font-display font-black text-2xl uppercase tracking-tighter text-white">
            FPL<span className="text-fpl-cyan">MOVE</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-8 px-4 flex flex-col gap-2 overflow-y-auto">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 mb-2">Menu</span>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? "bg-fpl-cyan/10 text-fpl-cyan" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg className={`w-5 h-5 ${isActive ? "text-fpl-cyan" : "group-hover:text-white"} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="font-display font-bold text-sm tracking-wide uppercase">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-fpl-cyan animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Wallet / User Profile Area */}
      <div className="p-4 border-t border-white/5 relative">
        {connected && account ? (
          <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fpl-cyan to-fpl-purple flex items-center justify-center p-[2px]">
                   <div className="w-full h-full bg-fpl-navy rounded-full flex items-center justify-center">
                     <span className="text-xs font-bold text-white uppercase">{account.address.toString().slice(2,4)}</span>
                   </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-fpl-green animate-pulse" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Connected</span>
                  </div>
                  <span className="text-sm text-white font-display font-bold uppercase tracking-wider">
                    {shortenAddress(account.address.toString())}
                  </span>
                </div>
             </div>
             <button
                onClick={disconnect}
                className="w-full py-2 rounded-lg text-xs font-display font-bold uppercase tracking-wider bg-white/5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                Disconnect
              </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => {
                setConnectHint(null);
                if (connectHintTimerRef.current) {
                  clearTimeout(connectHintTimerRef.current);
                  connectHintTimerRef.current = null;
                }
                setShowWalletList(!showWalletList);
              }}
              className="w-full group relative px-4 py-3.5 rounded-xl text-sm font-display font-bold uppercase tracking-wider overflow-hidden bg-fpl-purple text-white hover:text-fpl-navy hover:bg-fpl-cyan transition-all duration-300 glow-purple hover:glow-cyan"
            >
              <span className="relative z-10">Connect Wallet</span>
            </button>

            {/* Connecting Wallets Dropdown - renders upward since it's at bottom of sidebar */}
            {showWalletList && (
              <div className="absolute left-4 right-4 bottom-full mb-4 glass-card rounded-2xl border border-fpl-cyan/20 shadow-2xl shadow-black/50 overflow-hidden transform transition-all z-50">
                <div className="p-4 border-b border-white/10 bg-white/5">
                  <p className="text-sm font-display font-bold uppercase tracking-wider text-white">Select Wallet</p>
                </div>
                <div className="p-2 max-h-[min(50vh,20rem)] overflow-y-auto">
                  {connectHint ? (
                    <div className="px-2 py-2 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <p className="text-[10px] text-amber-100/90 leading-relaxed">{connectHint}</p>
                    </div>
                  ) : null}
                  {nightlyRows.length > 0 ? (
                    <>
                      {nightlyRows.map((row) => (
                        <button
                          key={row.name + row.mode}
                          type="button"
                          onClick={() => handleConnectWallet(row.name)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
                        >
                          {row.icon ? <img src={row.icon} alt={row.name} className="w-6 h-6 object-contain" /> : null}
                          <div>
                            <p className="text-sm font-display font-bold text-white group-hover:text-fpl-cyan">{row.name}</p>
                            <p className="text-[10px] text-fpl-cyan/80 font-bold uppercase tracking-wider">
                              {row.mode === "installed" ? "Installed" : "Open in Nightly app"}
                            </p>
                          </div>
                        </button>
                      ))}
                      {nightlyRows.some((r) => r.mode === "app") ? (
                        <>
                          <p className="px-2 py-2 text-[10px] text-white/45 leading-relaxed border-t border-white/10 mt-1">
                            If the app does not open: in Nightly go to <span className="text-white/70">Browser</span> / dApp and open this site
                            there — the wallet does not inject into mobile Safari/Chrome.
                          </p>
                          <div className="px-2 pb-2">
                            <WalletOnboardingLinks locale="en" />
                          </div>
                        </>
                      ) : null}
                      {connectHint && nightlyRows.length > 0 && !nightlyRows.some((r) => r.mode === "app") ? (
                        <div className="px-2 pb-2 pt-2 border-t border-white/10">
                          <WalletOnboardingLinks locale="en" />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <span className="text-2xl block mb-2">🔌</span>
                      <p className="text-xs font-bold text-white mb-2">No wallet detected</p>
                      <p className="text-[10px] text-white/45 leading-relaxed mb-3 text-left">
                        On mobile Safari/Chrome the wallet does not inject into the page. Open the <span className="text-white/65">Nightly</span>{" "}
                        app → <span className="text-white/65">Browser</span> (or dApps) and enter this site&apos;s URL there.
                      </p>
                      <WalletOnboardingLinks locale="en" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
