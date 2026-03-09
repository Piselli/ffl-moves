"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion, useMotionValue, useTransform, useSpring, animate } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getConfig, getGameweek } from "@/lib/aptos";
import { octasToMOVE } from "@/lib/utils";

// ─── Animated number counter ─────────────────────────────────────────────────
function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = v.toFixed(decimals) + suffix;
      },
    });
    return controls.stop;
  }, [to, suffix, decimals]);
  return <span ref={nodeRef}>0{suffix}</span>;
}

// ─── 3D tilt card (How It Works) ─────────────────────────────────────────────
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-80, 80], [12, -12]);
  const rotateY = useTransform(x, [-80, 80], [-12, 12]);
  const glareX = useTransform(x, [-80, 80], [0, 100]);
  const glareY = useTransform(y, [-80, 80], [0, 100]);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      x.set(e.clientX - rect.left - rect.width / 2);
      y.set(e.clientY - rect.top - rect.height / 2);
    },
    [x, y]
  );
  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: springX, rotateY: springY, transformStyle: "preserve-3d", perspective: 800 }}
      whileHover={{ scale: 1.03 }}
      transition={{ scale: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors duration-300 ${className}`}
    >
      {/* Glare layer */}
      <motion.div
        style={{
          background: useTransform(
            [glareX, glareY],
            ([gx, gy]) =>
              `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.10) 0%, transparent 60%)`
          ),
        }}
        className="absolute inset-0 pointer-events-none z-10"
      />
      {children}
    </motion.div>
  );
}

// ─── Score row (Tactical HUD) ─────────────────────────────────────────────────
function ScoreRow({ label, pts, color = "text-white/60" }: { label: string; pts: string; color?: string }) {
  return (
    <motion.li
      whileHover={{ x: 6, backgroundColor: "rgba(255,255,255,0.03)" }}
      transition={{ duration: 0.15 }}
      className="flex justify-between items-center py-3 px-3 rounded-xl cursor-default"
    >
      <span className="text-sm text-white/50 font-medium">{label}</span>
      <span className={`font-display font-black text-xl tabular-nums ${color}`}>{pts}</span>
    </motion.li>
  );
}

// ─── CSS Pitch SVG ────────────────────────────────────────────────────────────
function PitchSVG() {
  return (
    <svg
      viewBox="0 0 500 340"
      className="w-full h-full opacity-[0.18]"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    >
      {/* Outer boundary */}
      <rect x="20" y="20" width="460" height="300" rx="2" />
      {/* Centre line */}
      <line x1="250" y1="20" x2="250" y2="320" />
      {/* Centre circle */}
      <circle cx="250" cy="170" r="46" />
      <circle cx="250" cy="170" r="2" fill="white" stroke="none" />
      {/* Left penalty area */}
      <rect x="20" y="100" width="80" height="140" />
      {/* Left goal area */}
      <rect x="20" y="135" width="30" height="70" />
      {/* Right penalty area */}
      <rect x="400" y="100" width="80" height="140" />
      {/* Right goal area */}
      <rect x="450" y="135" width="30" height="70" />
      {/* Penalty spots */}
      <circle cx="76" cy="170" r="2.5" fill="white" stroke="none" />
      <circle cx="424" cy="170" r="2.5" fill="white" stroke="none" />
    </svg>
  );
}

// ─── Player cutout ────────────────────────────────────────────────────────────
function PlayerCutout({
  name,
  pos,
  pts,
  imgUrl,
  style,
  delay = 0,
}: {
  name: string;
  pos: string;
  pts: number;
  imgUrl: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
      className="absolute flex flex-col items-center select-none"
    >
      {/* Score badge */}
      <div className="mb-1.5 z-10">
        <div className="px-2.5 py-0.5 rounded-full bg-[#00e676] text-black text-xs font-black font-display shadow-lg shadow-[#00e676]/30">
          {pts}
        </div>
      </div>
      {/* Player image */}
      <div className="relative w-20 h-24 sm:w-24 sm:h-28">
        <img
          src={imgUrl}
          alt={name}
          className="w-full h-full object-contain drop-shadow-2xl"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      {/* Name + position */}
      <div className="mt-1 text-center">
        <div className="text-[10px] font-bold text-white/90 uppercase tracking-wider leading-none">{name}</div>
        <div className="text-[9px] text-white/40 font-medium mt-0.5">{pos}</div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const { connected } = useWallet();

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

  // ── How It Works steps ─────────────────────────────────────────────────────
  const steps = [
    {
      num: "01",
      title: "Збери склад",
      desc: "Вибери 11 гравців з Англійської Прем'єр-ліги на поточний тур. Будь-який гравець, жодних обмежень бюджету.",
      accent: "from-[#00F0FF] to-[#0077FF]",
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      num: "02",
      title: "Зареєструй склад",
      desc: "Зафіксуй свій вибір смарт-контрактом на блокчейні Movement. Це незмінний запис — ніхто не зможе підробити результат.",
      accent: "from-[#8B5CF6] to-[#EC4899]",
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      num: "03",
      title: "Перемагай",
      desc: "Гравці забивають, асистують і захищають в реальних матчах — ти автоматично отримуєш MOVE токени на гаманець.",
      accent: "from-[#00e676] to-[#00bcd4]",
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  // ── Scoring rules ──────────────────────────────────────────────────────────
  const posRules = [
    { label: "Вихід на поле (1+ хв)",   pts: "+1" },
    { label: "Вихід на поле (60+ хв)",  pts: "+1" },
    { label: "Гол (Нападник)",          pts: "+4", color: "text-[#00e676]" },
    { label: "Гол (Півзахисник)",       pts: "+5", color: "text-[#00e676]" },
    { label: "Гол (Захисник / ВР)",     pts: "+6", color: "text-[#00e676]" },
    { label: "Передача (Асист)",        pts: "+3", color: "text-[#00bcd4]" },
    { label: "Суха пара (ВР / Захист)", pts: "+4", color: "text-[#00bcd4]" },
    { label: "Відбитий пенальті",       pts: "+5", color: "text-amber-400" },
  ];
  const negRules = [
    { label: "Жовта картка",       pts: "−1", color: "text-red-400" },
    { label: "Червона картка",     pts: "−3", color: "text-red-400" },
    { label: "Автогол",            pts: "−2", color: "text-red-400" },
    { label: "Незабитий пенальті", pts: "−2", color: "text-red-400" },
  ];
  const ratingRules = [
    { label: "Рейтинг 9.0+",    pts: "+3", color: "text-[#00e676]" },
    { label: "Рейтинг 8.0–8.9", pts: "+2", color: "text-[#00e676]" },
    { label: "Рейтинг 7.5–7.9", pts: "+1" },
    { label: "Рейтинг < 6.0",   pts: "−1", color: "text-red-400" },
  ];

  // ── Players for hero pitch ─────────────────────────────────────────────────
  // Using publicly available Premier League player images (BBC Sport / transparent stock)
  const players = [
    {
      name: "Haaland",
      pos: "FWD",
      pts: 18,
      imgUrl: "https://resources.premierleague.com/premierleague/photos/players/250x250/p223094.png",
      style: { left: "50%", top: "10%", transform: "translateX(-50%)" },
      delay: 0.2,
    },
    {
      name: "Salah",
      pos: "MID",
      pts: 14,
      imgUrl: "https://resources.premierleague.com/premierleague/photos/players/250x250/p118748.png",
      style: { left: "18%", top: "38%", transform: "translateX(-50%)" },
      delay: 0.35,
    },
    {
      name: "Saka",
      pos: "MID",
      pts: 11,
      imgUrl: "https://resources.premierleague.com/premierleague/photos/players/250x250/p223340.png",
      style: { right: "18%", top: "38%", transform: "translateX(50%)" },
      delay: 0.5,
    },
    {
      name: "Alexander-Arnold",
      pos: "DEF",
      pts: 9,
      imgUrl: "https://resources.premierleague.com/premierleague/photos/players/250x250/p193490.png",
      style: { left: "28%", top: "66%", transform: "translateX(-50%)" },
      delay: 0.65,
    },
    {
      name: "Raya",
      pos: "GK",
      pts: 7,
      imgUrl: "https://resources.premierleague.com/premierleague/photos/players/250x250/p177815.png",
      style: { right: "28%", top: "66%", transform: "translateX(50%)" },
      delay: 0.8,
    },
  ];

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-[#0D0F12] text-white overflow-x-hidden min-h-screen">

      {/* ═══════════════════ SECTION A: HERO ═══════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col lg:flex-row items-center justify-between px-6 sm:px-10 lg:px-16 pt-24 pb-16 overflow-hidden">

        {/* Graphite radial background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(139,92,246,0.08)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(0,240,255,0.05)_0%,transparent_60%)] pointer-events-none" />

        {/* ── Left: Text + Stats ─────────────────────────────────────── */}
        <div className="relative z-10 flex-1 max-w-xl mb-16 lg:mb-0">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-8"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inset-0 rounded-full bg-[#00e676] opacity-75" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-[#00e676]" />
            </span>
            Сезон 1 · Живий на Movement
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl sm:text-7xl lg:text-8xl font-display font-black uppercase leading-[0.88] tracking-tight mb-8"
          >
            Керуй.
            <br />
            <span className="text-white/20">Перемагай.</span>
            <br />
            Заробляй.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-base text-white/40 leading-relaxed mb-10 max-w-md"
          >
            Вибери найкращих гравців АПЛ, зафіксуй склад на блокчейні та конвертуй свої знання в реальні нагороди.
          </motion.p>

          {/* Live on-chain stats */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-wrap items-stretch gap-3 mb-10"
          >
            <div className="flex-1 min-w-[130px] bg-white/[0.03] border border-white/8 rounded-2xl px-5 py-4">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1.5">Призовий фонд</p>
              <p className="text-2xl font-display font-black text-white tabular-nums">
                {dataLoading ? (
                  <span className="text-white/20 animate-pulse">—</span>
                ) : prizePool !== null ? (
                  <Counter to={prizePool} suffix=" MOVE" />
                ) : (
                  <span className="text-white/20">N/A</span>
                )}
              </p>
            </div>
            <div className="flex-1 min-w-[130px] bg-white/[0.03] border border-white/8 rounded-2xl px-5 py-4">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1.5">Менеджерів</p>
              <p className="text-2xl font-display font-black text-white tabular-nums">
                {dataLoading ? (
                  <span className="text-white/20 animate-pulse">—</span>
                ) : totalManagers !== null ? (
                  <Counter to={totalManagers} suffix="+" />
                ) : (
                  <span className="text-white/20">N/A</span>
                )}
              </p>
            </div>
            <div className="flex-1 min-w-[130px] bg-white/[0.03] border border-white/8 rounded-2xl px-5 py-4">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1.5">Мережа</p>
              <p className="text-2xl font-display font-black text-white">On-Chain</p>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-wrap items-center gap-4"
          >
            {connected ? (
              <Link
                href="/gameweek"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-display font-bold uppercase tracking-wider text-sm bg-white text-black hover:bg-white/90 transition-colors duration-200 shadow-lg shadow-white/10"
              >
                Зібрати склад
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <div className="relative inline-block">
                <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#00F0FF] opacity-50 blur" />
                <div className="relative bg-[#0D0F12] border border-white/20 text-white/70 px-8 py-3.5 rounded-xl font-display font-bold uppercase tracking-wider text-sm">
                  Підключи гаманець, щоб грати
                </div>
              </div>
            )}
            <motion.a
              href="#how-it-works"
              whileHover={{ x: 3 }}
              className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm transition-colors duration-200"
            >
              Як це працює
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.a>
          </motion.div>
        </div>

        {/* ── Right: Pitch + Players ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex-shrink-0 w-full max-w-[420px] lg:max-w-[480px] aspect-[500/340]"
        >
          {/* Pitch SVG */}
          <PitchSVG />

          {/* Ambient pitch glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,230,118,0.04)_0%,transparent_70%)] pointer-events-none" />

          {/* Player cutouts */}
          {players.map((p) => (
            <PlayerCutout key={p.name} {...p} />
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════ SECTION B: HOW IT WORKS ════════════════════════════ */}
      <section id="how-it-works" className="px-6 sm:px-10 lg:px-16 py-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.25em] mb-3">Починаємо</p>
          <h2 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tight">
            Як це працює
          </h2>
        </motion.div>

        {/* 3D Tilt Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <TiltCard className="p-8 h-full flex flex-col">
                {/* Step number watermark */}
                <span className="absolute top-4 right-6 text-6xl font-display font-black text-white/[0.04] select-none">
                  {s.num}
                </span>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.accent} flex items-center justify-center mb-7 shadow-xl`}>
                  {s.icon}
                </div>

                <h3 className="text-xl font-display font-bold text-white uppercase mb-3">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ SECTION C: TACTICAL HUD (SCORING) ══════════════════ */}
      <section id="scoring" className="relative px-6 sm:px-10 lg:px-16 py-28 overflow-hidden">
        {/* Atmospheric background overlay — very subtle locker room feel */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.25em] mb-3">Тактичний планшет</p>
          <h2 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tight">
            Система очок
          </h2>
        </motion.div>

        {/* HUD Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
          {/* Bonuses panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white/[0.02] border border-white/8 rounded-2xl p-7"
          >
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/8">
              <div className="w-2 h-6 rounded-full bg-[#00e676]" />
              <h3 className="text-lg font-display font-bold text-white uppercase tracking-wide">Бонуси</h3>
            </div>
            <ul className="space-y-0.5">
              {posRules.map((r) => (
                <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
              ))}
            </ul>
          </motion.div>

          {/* Penalties + Rating panels */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-5"
          >
            <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-7 flex-1">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/8">
                <div className="w-2 h-6 rounded-full bg-red-500" />
                <h3 className="text-lg font-display font-bold text-white uppercase tracking-wide">Штрафи</h3>
              </div>
              <ul className="space-y-0.5">
                {negRules.map((r) => (
                  <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
                ))}
              </ul>
            </div>

            <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-7 flex-1">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/8">
                <div className="w-2 h-6 rounded-full bg-amber-400" />
                <h3 className="text-lg font-display font-bold text-white uppercase tracking-wide">Бонус рейтингу</h3>
              </div>
              <ul className="space-y-0.5">
                {ratingRules.map((r) => (
                  <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ SECTION D: TALENTS TEASER ══════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-5xl rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden p-10 md:p-14"
        >
          {/* Subtle neon purple glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.10)_0%,transparent_60%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#8B5CF6]/5 blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-16">
            {/* Abstract glowing object */}
            <div className="shrink-0 relative w-24 h-24">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-2xl border border-[#8B5CF6]/30 animate-spin" style={{ animationDuration: "12s" }} />
              {/* Inner */}
              <div className="absolute inset-2 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-[#8B5CF6]/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] font-bold uppercase tracking-widest mb-4">
                Незабаром
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-white uppercase mb-4">
                Таланти
              </h2>
              <p className="text-white/40 text-base leading-relaxed max-w-xl">
                Розблокуй унікальні <span className="text-white/70 font-medium">Таланти</span> за MOVE — ігрову механіку, що множить твої очки на +5%, +10% або +15% за конкретних умов. Стратегічний вибір Таланта може вирішити все в боротьбі за перше місце.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
