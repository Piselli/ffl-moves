"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { getConfig, getGameweek } from "@/lib/aptos";
import { octasToMOVE } from "@/lib/utils";
import { AnimatedCard } from "@/components/AnimatedCard";
import { ScoreCounter } from "@/components/widgets/ScoreCounter";
import { SquadStatusWidget } from "@/components/widgets/SquadStatusWidget";
import { NextFixtureWidget } from "@/components/widgets/NextFixtureWidget";

// ─── Animation helpers ────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = (delayChildren = 0.1) => ({
  hidden: {},
  show:   { transition: { staggerChildren: delayChildren } },
});

// ─── Background orb ─────────────────────────────────────────────────────
function Orb({ className }: { className: string }) {
  return (
    <motion.div
      animate={{ y: [0, -30, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute rounded-full pointer-events-none -z-10 ${className}`}
    />
  );
}

// ─── Scoring row ────────────────────────────────────────────────────────
function ScoreRow({ label, pts, color = "text-white/70" }: { label: string; pts: string; color?: string }) {
  return (
    <motion.li
      whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.04)" }}
      transition={{ duration: 0.15 }}
      className="flex justify-between items-center py-2.5 px-3 rounded-xl cursor-default"
    >
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={`font-display font-black text-lg ${color}`}>{pts}</span>
    </motion.li>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Home() {
  const { connected } = useWallet();
  const heroRef = useRef<HTMLDivElement>(null);

  // Live on-chain data
  const [prizePool, setPrizePool] = useState<number | null>(null);
  const [totalManagers, setTotalManagers] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function fetchOnChainData() {
      try {
        const cfg = await getConfig();
        if (cfg?.currentGameweek) {
          const gw = await getGameweek(cfg.currentGameweek);
          if (gw) {
            setPrizePool(octasToMOVE(gw.prizePool));
            setTotalManagers(gw.totalEntries);
          }
        }
      } catch (e) {
        console.error("Failed to fetch on-chain data:", e);
      } finally {
        setDataLoading(false);
      }
    }
    fetchOnChainData();
  }, []);

  // Parallax on hero
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY       = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // ── Steps ─────────────────────────────────────────────────────────────
  const steps = [
    {
      num: "01",
      title: "Збери склад",
      desc: "Вибери 11 гравців з Англійської Прем'єр-ліги на поточний тур. Аналізуй форму, розклад і статистику.",
      gradient: "from-fpl-cyan to-blue-500",
      glow: "cyan" as const,
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    },
    {
      num: "02",
      title: "Зареєструй склад",
      desc: "Зафіксуй свою команду смарт-контрактом на блокчейні Movement. Без посередників, без довіри — тільки код.",
      gradient: "from-fpl-purple to-pink-500",
      glow: "purple" as const,
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    },
    {
      num: "03",
      title: "Перемагай",
      desc: "Гравці забивають, асистують і тримають 'суху' в реальному житті — ти автоматично отримуєш MOVE токени.",
      gradient: "from-fpl-green to-emerald-500",
      glow: "green" as const,
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
  ];

  // ── Positive scoring rules ────────────────────────────────────────────
  const posRules = [
    { label: "Вихід на поле (1+ хв)",    pts: "+1",  color: "text-white/60" },
    { label: "Вихід на поле (60+ хв)",   pts: "+1",  color: "text-white/60" },
    { label: "Гол (Нападник)",           pts: "+4",  color: "text-fpl-cyan"  },
    { label: "Гол (Півзахисник)",        pts: "+5",  color: "text-fpl-cyan"  },
    { label: "Гол (Захисник / ВР)",      pts: "+6",  color: "text-fpl-purple"},
    { label: "Передача (Асист)",         pts: "+3",  color: "text-white/60" },
    { label: "Суха пара (ВР / Захист)",  pts: "+4",  color: "text-fpl-green" },
    { label: "Відбитий пенальті",        pts: "+5",  color: "text-amber-400" },
  ];
  const negRules = [
    { label: "Жовта картка",  pts: "−1" },
    { label: "Червона картка", pts: "−3" },
    { label: "Автогол",       pts: "−2" },
    { label: "Незабитий пенальті", pts: "−2" },
  ];
  const ratingRules = [
    { label: "Рейтинг 9.0+",    pts: "+3", color: "text-fpl-cyan"    },
    { label: "Рейтинг 8.0–8.9", pts: "+2", color: "text-fpl-cyan"    },
    { label: "Рейтинг 7.5–7.9", pts: "+1", color: "text-white/60"    },
    { label: "Рейтинг < 6.0",   pts: "−1", color: "text-destructive" },
  ];

  // ======================================================================
  return (
    <div className="relative overflow-x-hidden">

      {/* ── Ambient orbs ────────────────────────────────────────────── */}
      <Orb className="w-[560px] h-[560px] bg-fpl-purple/20 blur-[140px] -top-24 -right-40" />
      <Orb className="w-[480px] h-[480px] bg-fpl-cyan/12 blur-[120px] top-1/2 -left-48" />

      {/* ════════════════════ SECTION 1: HERO ══════════════════════════ */}
      <section
        ref={heroRef}
        className="relative flex flex-col items-center justify-center text-center px-4 pt-28 pb-24 min-h-[88vh]"
      >
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-4xl mx-auto w-full"
        >
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card border-fpl-purple/30 text-fpl-purple font-bold tracking-widest text-xs mb-10 uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full bg-fpl-cyan opacity-75" />
              <span className="relative rounded-full h-2 w-2 bg-fpl-cyan" />
            </span>
            Сезон 1 — Живий на Movement
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-[82px] font-display font-black text-white uppercase tracking-tight leading-[0.9] mb-7"
          >
            Керуй.{" "}
            <span className="bg-gradient-to-r from-fpl-cyan via-fpl-purple to-fpl-cyan bg-clip-text text-transparent bg-[length:200%_auto]">
              Перемагай.
            </span>
            <br />Заробляй.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Фентезі АПЛ нового покоління — твої знання конвертуються в реальні нагороди на{" "}
            <span className="text-white font-semibold">Movement Network</span>.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            {connected ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/gameweek"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-fpl-purple font-display uppercase tracking-wider text-sm glow-purple hover:bg-fpl-cyan hover:text-fpl-navy transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Зібрати склад
                </Link>
              </motion.div>
            ) : (
              <div className="relative">
                {/* pulsing glow ring */}
                <div className="absolute -inset-1 rounded-xl bg-fpl-purple/40 blur-md animate-pulse" />
                <div className="relative glass-card px-8 py-4 rounded-xl border-fpl-purple/50 text-fpl-purple font-display font-bold uppercase tracking-wider text-sm">
                  Підключи гаманець, щоб грати
                </div>
              </div>
            )}
            <motion.a
              whileHover={{ scale: 1.04 }}
              href="#how-it-works"
              className="text-muted-foreground hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              Як це працює
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.a>
          </motion.div>

          {/* ── Live on-chain stats ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            {/* Prize Pool — real on-chain */}
            <div className="glass-card px-7 py-5 rounded-2xl border-fpl-cyan/20 text-center min-w-[160px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1.5">
                Призовий фонд
              </p>
              <p className="text-3xl font-display font-black text-fpl-cyan">
                {dataLoading ? (
                  <span className="animate-pulse text-white/30">—</span>
                ) : prizePool !== null ? (
                  <ScoreCounter to={prizePool} suffix=" MOVE" decimals={0} duration={1.4} />
                ) : (
                  <span className="text-white/30">N/A</span>
                )}
              </p>
            </div>

            {/* Total Managers — real on-chain */}
            <div className="glass-card px-7 py-5 rounded-2xl border-fpl-purple/20 text-center min-w-[160px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1.5">
                Менеджерів
              </p>
              <p className="text-3xl font-display font-black text-white">
                {dataLoading ? (
                  <span className="animate-pulse text-white/30">—</span>
                ) : totalManagers !== null ? (
                  <ScoreCounter to={totalManagers} suffix="+" decimals={0} duration={1.4} />
                ) : (
                  <span className="text-white/30">N/A</span>
                )}
              </p>
            </div>

            {/* Chain badge — static */}
            <div className="glass-card px-7 py-5 rounded-2xl border-white/10 text-center min-w-[160px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1.5">
                Блокчейн
              </p>
              <p className="text-2xl font-display font-black text-white">100% On-Chain</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ════ SECTION 1.5: CONNECTED DASHBOARD INJECT ══════════════════ */}
      <AnimatePresence>
        {connected && (
          <motion.section
            key="dashboard"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: "6rem" }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
          >
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wide mb-6 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-fpl-green animate-pulse" />
              Твій Command Center
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <NextFixtureWidget />
              <SquadStatusWidget connected={connected} />
              <AnimatedCard glowColor="cyan" delay={0.25} className="p-6 flex flex-col justify-center items-center text-center gap-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Призовий фонд</p>
                <p className="text-5xl font-display font-black text-fpl-cyan glow-cyan">
                  {prizePool !== null
                    ? <ScoreCounter to={prizePool} suffix=" MOVE" decimals={0} />
                    : "—"
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalManagers !== null ? `${totalManagers} менеджерів` : ""}
                </p>
              </AnimatedCard>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ════════════════ SECTION 2: HOW IT WORKS ═══════════════════════ */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-28">
        {/* Section header */}
        <motion.div
          variants={stagger()}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">
            Починаємо
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight mb-4">
            Як це працює
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-lg mx-auto">
            Три простих кроки, щоб стати частиною найпремільнішої фентезі-ліги на блокчейні.
          </motion.p>
        </motion.div>

        {/* Steps grid */}
        <motion.div
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {steps.map((s) => (
            <motion.div key={s.num} variants={fadeUp}>
              <AnimatedCard glowColor={s.glow} className="p-9 h-full flex flex-col relative text-center group">
                {/* Watermark step number */}
                <span className="absolute top-5 right-7 text-7xl font-display font-black text-white/[0.04] select-none group-hover:text-white/[0.07] transition-colors">
                  {s.num}
                </span>

                {/* Icon */}
                <div className={`w-16 h-16 mx-auto mb-7 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg shadow-black/40 group-hover:-translate-y-1.5 transition-transform duration-300`}>
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                  </svg>
                </div>

                <h3 className="text-xl font-display font-bold text-white uppercase mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{s.desc}</p>
              </AnimatedCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════════ SECTION 3: SCORING ENGINE ═════════════════════ */}
      <section id="scoring" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-28">
        {/* Header */}
        <motion.div
          variants={stagger()}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">
            Механіка гри
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
            Система очок
          </motion.h2>
        </motion.div>

        {/* Rules grid */}
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-2 gap-8"
        >
          {/* Positive */}
          <motion.div variants={fadeUp}>
            <AnimatedCard glowColor="green" className="p-8 h-full">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-fpl-green/10 border border-fpl-green/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-fpl-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-white uppercase">Бонуси</h3>
              </div>
              <ul className="space-y-1">
                {posRules.map((r) => (
                  <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
                ))}
              </ul>
            </AnimatedCard>
          </motion.div>

          {/* Negative + rating */}
          <motion.div variants={fadeUp} className="flex flex-col gap-6">
            <AnimatedCard glowColor="purple" className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Штрафи</h3>
              </div>
              <ul className="space-y-1">
                {negRules.map((r) => (
                  <ScoreRow key={r.label} label={r.label} pts={r.pts} color="text-destructive" />
                ))}
              </ul>
            </AnimatedCard>

            <AnimatedCard glowColor="cyan" className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-fpl-cyan/10 border border-fpl-cyan/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-fpl-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Бонус за рейтинг</h3>
              </div>
              <ul className="space-y-1">
                {ratingRules.map((r) => (
                  <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
                ))}
              </ul>
            </AnimatedCard>
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════════ SECTION 4: TALENTS (COMING SOON) ══════════════ */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatedCard glowColor="purple" className="p-10 md:p-14 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(260,100%,65%,0.12)_0%,transparent_65%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Icon */}
              <div className="shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-fpl-navy border border-fpl-purple/40 flex items-center justify-center glow-purple">
                  <svg className="w-10 h-10 text-fpl-purple" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div className="text-center md:text-left flex-1">
                <div className="inline-block px-3 py-1 rounded-full bg-fpl-purple/10 border border-fpl-purple/30 text-fpl-purple text-xs font-bold uppercase tracking-widest mb-4">
                  Незабаром
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase mb-3">
                  Таланти
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
                  Розблокуй унікальні{" "}
                  <span className="text-white font-medium">Таланти</span>{" "}
                  за MOVE — ігрову механіку, яка буде множити твої бали на 5%, 10% або 15% за певних умов.
                  Стратегічний вибір Таланта стане ключовим у боротьбі за лідерство.
                </p>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>
      </section>
    </div>
  );
}
