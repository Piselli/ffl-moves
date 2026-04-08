"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { shortenAddress } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { connected, account, connect, disconnect, wallets } = useWallet();
  const [showWalletList, setShowWalletList] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnectWallet = async (walletName: string) => {
    try {
      await connect(walletName as any);
      setShowWalletList(false);
    } catch (e) {
      console.error("Failed to connect:", e);
    }
  };

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
              onClick={() => setShowWalletList(!showWalletList)}
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
                <div className="p-2 max-h-48 overflow-y-auto">
                  {(wallets?.filter(w => w.readyState === "Installed" && w.name === "Nightly") || []).map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleConnectWallet(wallet.name)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
                    >
                      <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 object-contain" />
                      <p className="text-sm font-display font-bold text-white group-hover:text-fpl-cyan">{wallet.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
