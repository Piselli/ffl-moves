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
  // ── Scoring categories (Balanced for UI) ───────────────────────────────────
  const attackRules = [
    { label: "Гол (Нападник)",            pts: "+5",  color: "text-[#00e676]" },
    { label: "Гол (Півзахисник)",         pts: "+5",  color: "text-[#00e676]" },
    { label: "Гол (Захисник)",            pts: "+6",  color: "text-[#00e676]" },
    { label: "Гол (Воротар)",             pts: "+10", color: "text-[#00e676]" },
    { label: "Асист",                     pts: "+3",  color: "text-[#00bcd4]" },
  ];
  const defenseRules = [
    { label: "Суха пара (ВР / Зах)",      pts: "+4",  color: "text-[#00bcd4]" },
    { label: "Суха пара (Півзахист)",     pts: "+1",  color: "text-[#00bcd4]" },
    { label: "Кожні 3 сейви (ВР)",        pts: "+1",  color: "text-amber-400" },
    { label: "Відбитий пенальті (ВР)",    pts: "+5",  color: "text-amber-400" },
  ];
  const penaltyRules = [
    { label: "Жовта картка",              pts: "−1",  color: "text-red-400" },
    { label: "Червона картка",            pts: "−3",  color: "text-red-400" },
    { label: "Автогол",                   pts: "−2",  color: "text-red-400" },
    { label: "Незабитий пенальті",        pts: "−2",  color: "text-red-400" },
    { label: "Пропущений гол (×2, ВР/Зах)", pts: "−1", color: "text-red-400" },
  ];
  const baseRules = [
    { label: "Вихід на поле (1–59 хв)",   pts: "+1",  color: "text-white/70" },
    { label: "Вихід на поле (60+ хв)",    pts: "+2",  color: "text-white/70" },
    { label: "Гравець матчу (BPS)",       pts: "+3",  color: "text-[#FFD700]" },
    { label: "Хет-трик",                  pts: "+3",  color: "text-[#FFD700]" },
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
      <section className="relative min-h-screen flex flex-col justify-start px-6 sm:px-10 lg:px-16 pt-[110px] pb-20">

        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/manager-bg.png"
            alt="Fantasy EPL Tactical Board"
            className="absolute inset-0 w-full h-full object-cover object-right"
          />
          {/* Gradient: Much darker on left for perfect text readability, fades to transparent on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 from-20% via-[#0D0F12]/90 via-50% to-transparent" />
          {/* Bottom fade — fades fully to #0D0F12 so the transition to the next section is seamless */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0D0F12]" />
        </div>

        {/* Ambient accent glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(139,92,246,0.12)_0%,transparent_60%)] pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(0,240,255,0.08)_0%,transparent_60%)] pointer-events-none -z-10" />

        {/* ── Top/Left: Text ─────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-2xl pt-3 flex flex-col gap-10">

          {/* Text Group */}
          <div className="flex flex-col gap-5">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl sm:text-7xl font-display font-black uppercase leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 pb-2"
            >
              Керуй.
              <br />
              <span className="text-white/20 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">Перемагай.</span>
              <br />
              Заробляй.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-lg text-white/50 leading-relaxed max-w-xl"
            >
              Вибери найкращих гравців АПЛ, зафіксуй склад на блокчейні та конвертуй свої тактичні знання в реальні крипто-нагороди.
            </motion.p>
          </div>

          {/* ── Bottom/Left: Stats & CTAs ─────────────────────────────────────── */}
          <div className="flex flex-col items-start gap-8">
            {/* Live on-chain stats */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-row items-center justify-start gap-4"
            >
            <div className="flex flex-col items-start bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl px-4 py-2 shadow-lg shadow-black/20">
              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1">Призовий фонд</p>
              <p className="text-2xl sm:text-3xl font-display font-black text-white tabular-nums">
                {dataLoading ? (
                  <span className="text-white/20 animate-pulse">—</span>
                ) : prizePool !== null ? (
                  <Counter to={prizePool} suffix=" MOVE" />
                ) : (
                  <span className="text-white/20">N/A</span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-start bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl px-4 py-2 shadow-lg shadow-black/20">
              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1">Менеджерів</p>
              <p className="text-2xl sm:text-3xl font-display font-black text-white tabular-nums">
                {dataLoading ? (
                  <span className="text-white/20 animate-pulse">—</span>
                ) : totalManagers !== null ? (
                  <Counter to={totalManagers} suffix="+" />
                ) : (
                  <span className="text-white/20">N/A</span>
                )}
              </p>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-col items-center sm:items-start gap-4 w-full sm:w-auto"
          >
            {connected ? (
              <Link
                href="/gameweek"
                className="inline-flex items-center justify-center gap-2 px-10 py-5 w-full sm:w-auto sm:min-w-[280px] rounded-2xl font-display font-black uppercase tracking-widest text-lg bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                Зібрати склад
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <div
                className="relative group cursor-pointer inline-block w-full sm:w-auto"
                onClick={() => (document.getElementById('wallet-connect-btn') as HTMLButtonElement)?.click()}
              >
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#00F0FF] opacity-70 group-hover:opacity-100 blur transition-opacity duration-300" />
                <div className="relative bg-[#0D0F12] border border-white/10 text-white px-12 py-5 w-full sm:w-auto sm:min-w-[280px] rounded-2xl font-display font-black uppercase tracking-widest text-lg text-center flex items-center justify-center gap-2">
                  <span>Обрати свій склад</span>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            )}
            
            <motion.a
              href="#how-it-works"
              whileHover={{ y: 2 }}
              className="flex items-center justify-center gap-1.5 text-white/40 hover:text-white/80 text-sm font-medium transition-colors sm:ml-4"
            >
              Як це працює
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.a>
          </motion.div>
        </div>
        </div>
      </section>

      {/* ═══════════════════ SECTION B: HOW IT WORKS ════════════════════════════ */}
      <section id="how-it-works" className="px-6 sm:px-10 lg:px-16 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 max-w-5xl mx-auto"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] mb-3">Починаємо</p>
          <h2 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tight">
            Як це працює
          </h2>
        </motion.div>

        {/* 3D Tilt Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
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
                <span className="absolute top-4 right-6 text-5xl font-display font-black text-white/[0.07] select-none">
                  {s.num}
                </span>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.accent} flex items-center justify-center mb-5 shadow-lg`}>
                  {s.icon}
                </div>

                <h3 className="text-lg font-display font-bold text-white uppercase mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ SECTION C: TACTICAL HUD (SCORING) ══════════════════ */}
      <section id="scoring" className="relative px-6 sm:px-10 lg:px-16 py-24 overflow-hidden">
        {/* Separator line top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        {/* Ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,230,118,0.05)_0%,transparent_60%)] pointer-events-none" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 max-w-5xl mx-auto"
        >
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] mb-3">Тактичний планшет</p>
          <h2 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tight">
            Система очок
          </h2>
          <p className="mt-3 text-white/40 text-sm max-w-lg">
            Очки нараховуються автоматично після кожного матчу на основі офіційних даних FPL API.
          </p>
        </motion.div>

        {/* 4-panel grid */}
        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">

          {/* Panel 1 — Атака */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
              <div className="w-8 h-8 rounded-xl bg-[#00e676]/15 flex items-center justify-center text-base">⚔️</div>
              <div>
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">Атака</h3>
                <p className="text-[10px] text-white/30 mt-0.5">Голи та результативні передачі</p>
              </div>
            </div>
            <ul className="space-y-1 flex-1">
              {attackRules.map((r) => (
                <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
              ))}
            </ul>
          </motion.div>

          {/* Panel 2 — Захист */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="bg-white/[0.03] border border-cyan-400/10 rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/10 flex items-center justify-center text-base">🛡️</div>
              <div>
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">Захист</h3>
                <p className="text-[10px] text-white/30 mt-0.5">Сухі матчі та сейви воротаря</p>
              </div>
            </div>
            <ul className="space-y-1 flex-1">
              {defenseRules.map((r) => (
                <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
              ))}
            </ul>
          </motion.div>

          {/* Panel 3 — Штрафи */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="bg-white/[0.03] border border-red-500/10 rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-base">🟥</div>
              <div>
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest">Штрафи</h3>
                <p className="text-[10px] text-white/30 mt-0.5">Помилки, пропущені голи та картки</p>
              </div>
            </div>
            <ul className="space-y-1 flex-1">
              {penaltyRules.map((r) => (
                <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
              ))}
            </ul>
          </motion.div>

          {/* Panel 4 — Базові & Бонуси */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="relative bg-gradient-to-br from-[#FFD700]/[0.05] to-transparent border border-[#FFD700]/15 rounded-2xl p-6 flex flex-col overflow-hidden"
          >
            {/* Gold glow */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#FFD700]/8 blur-[40px] pointer-events-none" />
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#FFD700]/15 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FFD700]/15 flex items-center justify-center text-base">🏆</div>
              <div>
                <h3 className="text-sm font-display font-bold text-[#FFD700] uppercase tracking-widest">Активи та Бонуси</h3>
                <p className="text-[10px] text-white/30 mt-0.5">Ігровий час та спеціальні нагороди</p>
              </div>
            </div>
            <ul className="space-y-1 flex-1 relative z-10">
              {baseRules.map((r) => (
                <ScoreRow key={r.label} label={r.label} pts={r.pts} color={r.color} />
              ))}
            </ul>
          </motion.div>

        </div>
      </section>

      {/* ═══════════════════ SECTION D: TALENTS TEASER ══════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-5xl mx-auto rounded-2xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.04] overflow-hidden p-8 md:p-10"
        >
          {/* Purple glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.12)_0%,transparent_60%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#8B5CF6]/8 blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12">
            {/* Static badge icon */}
            <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] font-bold uppercase tracking-widest mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                Незабаром
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase mb-3">
                Таланти & Гільдії
              </h2>
              <p className="text-white/45 text-sm leading-relaxed max-w-xl">
                Розблокуй унікальні <span className="text-white/75 font-semibold">Таланти</span> та <span className="text-white/75 font-semibold">Гільдії</span> за MOVE — вони множать фінальні очки на +5%, +10% або +15% при виконанні умов. Стратегічний вибір може вирішити все в боротьбі за перше місце.
              </p>
            </div>

            {/* Multiplier pills */}
            <div className="shrink-0 flex flex-col gap-2">
              {["+5%", "+10%", "+15%"].map((m, i) => (
                <div key={m} className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-center">
                  <span className="text-lg font-display font-black text-white">{m}</span>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">
                    {["Common", "Rare", "Epic"][i]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
