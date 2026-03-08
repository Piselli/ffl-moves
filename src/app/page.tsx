"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { getConfig, getGameweek } from "@/lib/aptos";
import { AnimatedCard } from "@/components/AnimatedCard";
import { ScoreCounter } from "@/components/widgets/ScoreCounter";
import { SquadStatusWidget } from "@/components/widgets/SquadStatusWidget";
import { NextFixtureWidget } from "@/components/widgets/NextFixtureWidget";

// ─── Stagger container helpers ─────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Floating accent orbs ──────────────────────────────────────────────────
function FloatingOrb({ className }: { className: string }) {
  return (
    <motion.div
      animate={{ y: [0, -24, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute rounded-full pointer-events-none blur-[120px] -z-10 ${className}`}
    />
  );
}

// ─── Steps data ────────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Draft Squad",
    desc: "Scout & select your optimal 11 in a 4-3-3 formation from real Premier League players.",
    gradient: "from-fpl-cyan to-blue-500",
    glow: "cyan" as const,
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    step: "02",
    title: "Stake Entry",
    desc: "Sign the on-chain transaction to lock your team and enter the gameweek prize pool.",
    gradient: "from-fpl-purple to-pink-500",
    glow: "purple" as const,
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    step: "03",
    title: "Track Action",
    desc: "Watch live as your players rack up points from real Premier League stats.",
    gradient: "from-fpl-green to-emerald-500",
    glow: "green" as const,
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    step: "04",
    title: "Claim Rewards",
    desc: "Top managers automatically receive a share of the massive MOVE prize pool.",
    gradient: "from-amber-400 to-orange-500",
    glow: "gold" as const,
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  },
];

const POSITIVE_RULES = [
  ["Playing 1+ minutes",    "+1", "text-white/60"],
  ["Playing 60+ minutes",   "+1", "text-white/60"],
  ["Goal (Forward)",        "+4", "text-fpl-cyan"],
  ["Goal (Midfielder)",     "+5", "text-fpl-cyan"],
  ["Goal (Defender / GK)",  "+6", "text-fpl-purple"],
  ["Assist",                "+3", "text-white/60"],
  ["Clean Sheet (GK / DEF)","+4", "text-fpl-green"],
  ["Penalty Saved",         "+5", "text-amber-400"],
];

const NEGATIVE_RULES = [
  ["Yellow Card",     "-1"],
  ["Red Card",        "-3"],
  ["Own Goal",        "-2"],
  ["Penalty Missed",  "-2"],
];

const RATING_RULES = [
  ["Rating 9.0+",     "+3", "text-fpl-cyan"],
  ["Rating 8.0-8.9",  "+2", "text-fpl-cyan"],
  ["Rating 7.5-7.9",  "+1", "text-white/60"],
  ["Rating < 6.0",    "-1", "text-destructive"],
];

// ═══════════════════════════════════════════════════════════════════════════
export default function Home() {
  const { connected } = useWallet();
  const heroRef = useRef<HTMLDivElement>(null);
  const [prizePool, setPrizePool] = useState(5000);
  const [totalManagers, setTotalManagers] = useState(1240);

  // parallax for hero badge / headline
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY    = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    async function fetch() {
      const cfg = await getConfig();
      if (cfg?.currentGameweek) {
        const gw = await getGameweek(cfg.currentGameweek);
        if (gw?.prizePool)      setPrizePool(Number(gw.prizePool) / 1e8);
        if (gw?.totalEntries)   setTotalManagers(Number(gw.totalEntries));
      }
    }
    fetch();
  }, []);

  return (
    <div className="relative overflow-x-hidden">

      {/* ── Background orbs ─────────────────────────────────────── */}
      <FloatingOrb className="w-[520px] h-[520px] bg-fpl-purple/25 top-0 -right-40" />
      <FloatingOrb className="w-[600px] h-[600px] bg-fpl-cyan/15 top-1/3 -left-60" />

      {/* ══════════════════════ HERO ════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-24">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-4xl mx-auto">

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card border-fpl-purple/30 text-fpl-purple font-bold tracking-widest text-xs mb-8 uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full bg-fpl-cyan opacity-75" />
              <span className="relative rounded-full h-2 w-2 bg-fpl-cyan" />
            </span>
            Season 1 is Live on Movement
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-8xl font-display font-black text-white uppercase tracking-tight leading-none mb-6"
          >
            Fantasy EPL<br />
            <span className="bg-gradient-to-r from-fpl-cyan via-fpl-purple to-fpl-cyan bg-clip-text text-transparent bg-[length:200%_auto] animate-pulse">
              On-Chain
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light"
          >
            Collect, build&nbsp;&&nbsp;compete. The ultimate Web3 fantasy football ecosystem powered by the{" "}
            <span className="text-white font-semibold">Movement Network</span>.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {connected ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/gameweek"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-fpl-purple font-display uppercase tracking-wider text-sm glow-purple hover:bg-fpl-cyan hover:text-fpl-navy transition-all duration-200"
                >
                  Pick Your Squad
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </Link>
              </motion.div>
            ) : (
              <div className="glass-card px-8 py-4 rounded-xl border-fpl-cyan/40 text-fpl-cyan font-display font-bold uppercase tracking-wider text-sm animate-pulse">
                Connect Wallet to Play
              </div>
            )}
            <motion.a
              whileHover={{ scale: 1.04 }}
              href="#how-it-works"
              className="text-muted-foreground hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              See How It Works ↓
            </motion.a>
          </motion.div>

          {/* Floating stat pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-16 flex flex-wrap justify-center gap-4"
          >
            {[
              { label: "Prize Pool", value: prizePool, suffix: " MOVE", decimals: 0 },
              { label: "Managers",   value: totalManagers, suffix: "+", decimals: 0 },
              { label: "On Movement", value: 100, suffix: "% On-Chain", decimals: 0 },
            ].map(({ label, value, suffix, decimals }) => (
              <div key={label} className="glass-card px-6 py-3 rounded-2xl border-white/10 text-center min-w-[130px]">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-display font-black text-white">
                  <ScoreCounter to={value} suffix={suffix} decimals={decimals} />
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════ DASHBOARD INJECT (connected only) ══════ */}
      <AnimatePresence>
        {connected && (
          <motion.section
            key="dashboard"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-24 overflow-hidden"
          >
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wide mb-6 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-fpl-green animate-pulse" />
              Your Command Center
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="md:col-span-1"><NextFixtureWidget /></div>
              <div className="md:col-span-1"><SquadStatusWidget connected={connected} /></div>
              <AnimatedCard glowColor="cyan" delay={0.2} className="p-6 flex flex-col justify-center items-center text-center gap-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prize Pool GW1</p>
                <p className="text-5xl font-display font-black text-fpl-cyan glow-cyan">
                  <ScoreCounter to={prizePool} suffix=" MOVE" />
                </p>
                <p className="text-xs text-muted-foreground">{totalManagers} managers entered</p>
              </AnimatedCard>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ══════════════════ HOW IT WORKS ════════════════════════════ */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">The Journey</p>
          <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight mb-4">
            How&nbsp;It&nbsp;Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Master the market, deploy your squad, and dominate the global leaderboards.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {HOW_IT_WORKS.map((item) => (
            <motion.div key={item.step} variants={itemVariants}>
              <AnimatedCard
                glowColor={item.glow}
                className="p-8 h-full flex flex-col group text-center"
              >
                {/* Big step number watermark */}
                <span className="absolute top-4 right-6 text-6xl font-display font-black text-white/5 group-hover:text-white/10 transition-colors select-none">
                  {item.step}
                </span>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg shadow-black/40 group-hover:-translate-y-1 transition-transform duration-300`}>
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>

                <h3 className="text-xl font-display font-bold text-white mb-3 uppercase">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
              </AnimatedCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════ SCORING RULES ═══════════════════════════ */}
      <section id="rules" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Game Mechanics</p>
          <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
            Scoring System
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-2 gap-8"
        >
          {/* Positive */}
          <motion.div variants={itemVariants}>
            <AnimatedCard glowColor="green" className="p-8 h-full">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-fpl-green/10 border border-fpl-green/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-fpl-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-white uppercase">Performance Engine</h3>
              </div>
              <ul className="space-y-3">
                {POSITIVE_RULES.map(([label, pts, color]) => (
                  <motion.li
                    key={label}
                    whileHover={{ x: 4 }}
                    className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className={`font-display font-black text-lg ${color}`}>{pts}</span>
                  </motion.li>
                ))}
              </ul>
            </AnimatedCard>
          </motion.div>

          {/* Negative + Rating */}
          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            <AnimatedCard glowColor="purple" className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Deductions</h3>
              </div>
              <ul className="space-y-2">
                {NEGATIVE_RULES.map(([label, pts]) => (
                  <motion.li
                    key={label}
                    whileHover={{ x: 4 }}
                    className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-destructive font-display font-black">{pts}</span>
                  </motion.li>
                ))}
              </ul>
            </AnimatedCard>

            <AnimatedCard glowColor="cyan" className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-fpl-cyan/10 border border-fpl-cyan/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-fpl-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Match Rating Bonus</h3>
              </div>
              <ul className="space-y-2">
                {RATING_RULES.map(([label, pts, color]) => (
                  <motion.li
                    key={label}
                    whileHover={{ x: 4 }}
                    className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-display font-black ${color}`}>{pts}</span>
                  </motion.li>
                ))}
              </ul>
            </AnimatedCard>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════ TITLES CTA ══════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatedCard
            glowColor="purple"
            className="p-12 md:p-16 text-center relative"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsla(260,100%,65%,0.12)_0%,transparent_70%)] pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-fpl-navy border border-fpl-purple/40 mx-auto flex items-center justify-center mb-8 glow-purple">
                <svg className="w-8 h-8 text-fpl-purple" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-6 uppercase">
                Unlock Elite Status
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                Acquire unique NFT Titles and form Guilds to unlock huge scoring multipliers (5–15%).
                Strategize your title selection to maximise returns based on match conditions.
              </p>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/titles"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-white/5 border border-fpl-purple/50 hover:bg-fpl-purple/20 hover:border-fpl-purple transition-all duration-300 font-display uppercase tracking-wider text-sm"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Explore Marketplace
                </Link>
              </motion.div>
            </div>
          </AnimatedCard>
        </motion.div>
      </section>
    </div>
  );
}
