"use client";

import { motion } from "framer-motion";
import { TreasureChest } from "@/components/TreasureChest";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { formatRewardPlaceEn, formatRewardPlaceUk } from "@/i18n/messages";
import { DEFAULT_PRIZE_TIERS } from "@/lib/prize-distribution";

/* ── Prize Distribution (percentages) ──────────────────────────────────────── */
const PRIZE_TIERS = DEFAULT_PRIZE_TIERS;

/* ── Row styles ────────────────────────────────────────────────────────────── */
const VIP_STYLES = {
  1: {
    bg: "bg-gradient-to-r from-yellow-400/20 via-yellow-400/5 to-transparent",
    border: "border border-yellow-400/30",
    textAmount: "text-yellow-400 drop-shadow-md",
    textLabel: "text-yellow-400/70",
    glow: "shadow-[inset_4px_0_0_#FACC15]",
    icon: "🥇",
    label: "1-ШЕ МІСЦЕ",
  },
  2: {
    bg: "bg-gradient-to-r from-gray-300/15 via-gray-300/5 to-transparent",
    border: "border border-gray-300/20",
    textAmount: "text-gray-200",
    textLabel: "text-gray-300/60",
    glow: "shadow-[inset_4px_0_0_#D1D5DB]",
    icon: "🥈",
    label: "2-ГЕ МІСЦЕ",
  },
  3: {
    bg: "bg-gradient-to-r from-amber-600/20 via-amber-600/5 to-transparent",
    border: "border border-amber-600/20",
    textAmount: "text-amber-500",
    textLabel: "text-amber-500/60",
    glow: "shadow-[inset_4px_0_0_#D97706]",
    icon: "🥉",
    label: "3-ТЄ МІСЦЕ",
  },
} as const;

/* ── Main Component ────────────────────────────────────────────────────────── */
export function RewardsLeaderboardTable({ totalPoolRaw }: { totalPoolRaw: number | null }) {
  const m = useSiteMessages();
  const prize = usePrizeAsset();
  const { locale } = useSiteLocale();
  const placeLabel = locale === "uk" ? formatRewardPlaceUk : formatRewardPlaceEn;
  const poolRaw =
    totalPoolRaw && totalPoolRaw > 0
      ? totalPoolRaw
      : prize.asset === "usdcx"
        ? 5_000_000
        : 300_00000000;

  const allTiers = PRIZE_TIERS.map(tier => {
    let type = "standard";
    let icon = null;
    let colorClass = "text-white/80";
    
    if (tier.rank === 1) {
      type = "gold";
      icon = "🥇";
      colorClass = "text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]";
    } else if (tier.rank === 2) {
      type = "silver";
      icon = "🥈";
      colorClass = "text-[#E2E8F0] drop-shadow-[0_0_8px_rgba(226,232,240,0.4)]";
    } else if (tier.rank === 3) {
      type = "bronze";
      icon = "🥉";
      colorClass = "text-[#F59E0B] drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]";
    }

    return {
      ...tier,
      type,
      icon,
      colorClass,
      prizeRaw: (poolRaw * tier.pct) / 100,
    };
  });

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-16 pb-2 items-end">
      
      {/* ══════════ LEFT COLUMN: TITLES & CHEST ══════════ */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex-1 w-full flex flex-col items-center lg:items-start text-center lg:text-left"
      >

        {/* Top Header Block */}
        <div className="w-full mt-2 lg:mt-0">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-3">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#00f948]" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#00f948] uppercase">
              {m.rewards.stepBadge}
            </span>
          </div>

          <h3 className="text-4xl sm:text-5xl lg:text-[60px] md:leading-[1.1] font-display font-black text-white tracking-tight drop-shadow-md mb-4">
            {m.rewards.titleLine1} <br className="hidden lg:block" /> {m.rewards.titleLine2}
          </h3>

          <p className="text-sm md:text-base text-white/50 max-w-md leading-relaxed mx-auto lg:mx-0 font-medium mb-4">
            {m.rewards.subtitle(prize.symbol)}
          </p>
        </div>

        {/* Treasure Chest */}
        <div className="relative z-10 w-full">
          <TreasureChest />
        </div>

      </motion.div>


      {/* ══════════ RIGHT COLUMN: THE PURE TABLE ══════════ */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full lg:w-[480px] flex-shrink-0"
      >
        <div className="w-full bg-[#111214]/60 backdrop-blur-xl rounded-[2rem] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 sm:p-2 flex flex-col overflow-hidden relative">
          
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

          {/* New Compact Header with only Pool Sum */}
          <div className="relative flex flex-col items-center justify-center px-4 py-2 border-b border-white/[0.04]">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-tighter drop-shadow-md">
                {prize.formatHero(poolRaw, locale)}
              </span>
              <span className="text-sm md:text-base font-bold text-[#00f948] uppercase tracking-widest drop-shadow-sm">
                {prize.symbol}
              </span>
            </div>
          </div>

          {/* Tiny complementary explanation header */}
          <div className="relative flex items-center justify-between px-6 sm:px-8 pb-3">
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">
              {m.rewards.colPosition}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">
              {m.rewards.colShare}
            </span>
          </div>

          {/* Table Body - Aggressively compressed vertical paddings */}
          <div className="relative flex flex-col divide-y divide-white/[0.02] px-2 md:px-3 pb-1">
            {allTiers.map((tier) => (
              <div 
                key={tier.rank} 
                className="group flex items-center justify-between px-4 sm:px-5 py-1.5 rounded-xl hover:bg-white/[0.02] transition-colors relative"
              >
                
                {/* Left Side: Rank & Place */}
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-6 flex justify-center text-lg sm:text-xl drop-shadow-sm">
                    {tier.icon ? (
                      <span className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{tier.icon}</span>
                    ) : (
                      <span className="text-xs font-black text-white/20 tabular-nums">
                        {tier.rank}
                      </span>
                    )}
                  </div>
                  <span className={`text-[#A0AEC0] text-xs font-medium ${tier.icon ? 'text-white/80' : 'text-white/40'}`}>
                    {placeLabel(tier.rank)}
                  </span>
                </div>

                {/* Right Side: PCT & prize output */}
                <div className="flex items-center gap-3 sm:gap-5">
                  <span className="text-[9px] text-white/20 font-bold tabular-nums">
                    {tier.pct}%
                  </span>
                  
                  <div className="flex items-baseline gap-1.5 w-[75px] sm:w-[90px] justify-end">
                    <span className={`text-base sm:text-lg font-display font-black tabular-nums tracking-tight ${tier.colorClass}`}>
                      {prize.formatCompact(tier.prizeRaw)}
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${tier.icon ? tier.colorClass : 'text-white/20'}`}>
                      {prize.symbol}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </motion.div>

    </div>
  );
}
