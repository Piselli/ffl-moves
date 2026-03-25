"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, animate } from "framer-motion";
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

// ─── Animated step (How It Works) ─────────────────────────────────────────────
function AnimatedStep({
  title,
  desc,
  subheader,
  visual,
  reverse = false,
}: {
  title: string;
  desc: string;
  subheader: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-12 lg:gap-20 items-center ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, x: reverse ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 w-full max-w-xl"
      >
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[#F5A623] text-sm md:text-base font-bold tracking-[0.2em] uppercase">
            {subheader}
          </span>
          <div className="h-px bg-[#F5A623]/30 flex-1" />
        </div>
        <h3 className="text-4xl md:text-5xl lg:text-5xl font-display font-black text-white uppercase tracking-tight leading-[1.1] mb-6 drop-shadow-xl">
          {title}
        </h3>
        <p className="text-lg md:text-xl text-white/50 leading-relaxed font-medium">
          {desc}
        </p>
      </motion.div>

      {/* Visual Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 w-full relative flex items-center justify-center p-8"
      >
        {visual}
      </motion.div>
    </div>
  );
}

// ─── Accordion ───────────────────────────────────────────────────────────────
function ScoringAccordion({
  title,
  subtitle,
  icon,
  rules,
  isOpen,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: string;
  rules: { label: string; pts: string; color: string }[];
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`w-full bg-white/[0.02] border transition-all duration-300 rounded-2xl overflow-hidden ${isOpen ? 'border-[#00F0FF]/30 shadow-[0_0_30px_rgba(0,240,255,0.05)]' : 'border-white/5 hover:border-white/10'}`}>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 text-left outline-none group"
      >
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${isOpen ? 'bg-[#00F0FF]/15 scale-110 shadow-lg' : 'bg-white/5 group-hover:bg-white/10'}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-display font-black text-white uppercase tracking-wide">{title}</h3>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${isOpen ? "rotate-180 border-[#00F0FF]/50 text-[#00F0FF] bg-[#00F0FF]/10" : "border-white/10 text-white/50 group-hover:border-white/20"}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 border-t border-white/5">
              <ul className="space-y-1">
                {rules.map((r, i) => (
                  <motion.li
                    key={r.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <ScoreRow label={r.label} pts={r.pts} color={r.color} />
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
    <svg className="absolute inset-0 w-full h-full opacity-[0.85] pointer-events-none" viewBox="0 0 650 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Soft elegant fading gradient for the field lines */}
        <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0, 255, 135, 0)" />
          <stop offset="15%" stopColor="rgba(0, 255, 135, 0.4)" />
          <stop offset="50%" stopColor="rgba(0, 255, 135, 0.2)" />
          <stop offset="85%" stopColor="rgba(0, 255, 135, 0.5)" />
          <stop offset="100%" stopColor="rgba(0, 255, 135, 0.9)" />
        </linearGradient>

        <radialGradient id="pitchGlow" cx="50%" cy="80%" r="70%">
          <stop offset="0%" stopColor="rgba(0, 255, 135, 0.15)" />
          <stop offset="100%" stopColor="rgba(0, 255, 135, 0)" />
        </radialGradient>
      </defs>

      {/* Subtle glowing floor plane */}
      <rect x="0" y="0" width="650" height="1000" fill="url(#pitchGlow)" rx="20" />

      {/* Modern, elegant, faint grid */}
      <g stroke="rgba(255,255,255,0.03)" strokeWidth="1">
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="650" y2={i * 50} />
        ))}
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="1000" />
        ))}
      </g>

      <g stroke="url(#lineFade)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Pitch Outer Bounds (slightly thinner, elegant corners) */}
        <rect x="25" y="25" width="600" height="950" rx="10" />
        {/* Center Line */}
        <line x1="25" y1="500" x2="625" y2="500" />
        {/* Center Circle */}
        <circle cx="325" cy="500" r="90" />
        
        {/* Penalty Box (Bottom) */}
        <rect x="125" y="825" width="400" height="150" />
        {/* Goal Area (Bottom) */}
        <rect x="235" y="915" width="180" height="60" />
        {/* Penalty Arc (Bottom) */}
        <path d="M 265 825 A 70 70 0 0 0 385 825" />
        
        {/* Penalty Box (Top) */}
        <rect x="125" y="25" width="400" height="150" />
        {/* Goal Area (Top) */}
        <rect x="235" y="25" width="180" height="60" />
        {/* Penalty Arc (Top) */}
        <path d="M 265 175 A 70 70 0 0 1 385 175" />
      </g>
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
  
  // Accordion state
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

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


  // ── 11-Man Squad for hero pitch (4-3-3 Horizontal) - Centered & Tightened
  const squad11 = [
    // GK (Goal box bottom)
    { name: "Pickford", pos: "GK", pts: 7, imgUrl: "p111234.png", left: "50%", top: "96%", z: 10, delay: 0.1 },
    // DEF (Curved line)
    { name: "Cucurella", pos: "DEF", pts: 6, imgUrl: "p179268.png", left: "15%", top: "76%", z: 20, delay: 0.2 },
    { name: "Saliba", pos: "DEF", pts: 8, imgUrl: "p462424.png", left: "38%", top: "80%", z: 30, delay: 0.3 },
    { name: "Gabriel", pos: "DEF", pts: 6, imgUrl: "p226597.png", left: "62%", top: "80%", z: 30, delay: 0.4 },
    { name: "Porro", pos: "DEF", pts: 9, imgUrl: "p441164.png", left: "85%", top: "76%", z: 20, delay: 0.5 },
    // MID (V-shape)
    { name: "Palmer", pos: "MID", pts: 12, imgUrl: "p244851.png", left: "25%", top: "54%", z: 40, delay: 0.6 },
    { name: "Foden", pos: "MID", pts: 8, imgUrl: "p209244.png", left: "50%", top: "60%", z: 50, delay: 0.7 },
    { name: "Bruno", pos: "MID", pts: 11, imgUrl: "p208706.png", left: "75%", top: "54%", z: 40, delay: 0.8 },
    // FWD (V-shape, Swap Watkins <-> Saka)
    { name: "Watkins", pos: "FWD", pts: 15, imgUrl: "p178301.png", left: "25%", top: "34%", z: 60, delay: 0.9 },
    { name: "Haaland", pos: "FWD", pts: 18, imgUrl: "p223094.png", left: "50%", top: "28%", z: 70, delay: 1.0 },
    { name: "Saka", pos: "FWD", pts: 14, imgUrl: "p223340.png", left: "75%", top: "34%", z: 60, delay: 1.1 },
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

      {/* ═══════════════════ SECTION B: HOW IT WORKS (Animated Steps) ════════════ */}
      <section id="how-it-works" className="relative px-6 sm:px-10 lg:px-16 py-32 overflow-hidden bg-gradient-to-b from-[#0D0F12] via-[#121620] to-[#0D0F12]">
        <div className="max-w-7xl mx-auto space-y-32">
          
          <AnimatedStep
            subheader="Крок 1: Твоя тактика"
            title="Збирай свій склад"
            desc="У тебе є можливість зібрати 11 найкращих гравців з Англійської Прем'єр-ліги. Зроби трансфери, обери капітана та розстав пріоритети на полі. Твоє рішення безповоротно фіксується смарт-контрактом."
            visual={
              <div 
                className="relative w-full max-w-4xl mx-auto h-[450px] sm:h-[650px] flex items-center justify-center mt-10 mb-20 md:mb-0"
                style={{ perspective: '1200px' }}
              >
                {/* 3D Floor (The Pitch) - Static to preserve native 3D hardware matrix w/ strict aspect ratio */}
                <div 
                  className="absolute w-[95%] sm:w-[85%] h-[130%] origin-center"
                  style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: 'rotateX(55deg) translateY(-5%) scale(1.1)' 
                  }}
                >
                  {/* Glowing floor base WITHOUT backdrop-blur (which flattens 3D) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#00FF87]/10 via-[#00FF87]/5 to-transparent border-2 border-[#00FF87]/30 rounded-xl shadow-[0_0_100px_rgba(0,255,135,0.2)]" />
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,255,135,0.1)_1px,transparent_1px),linear-gradient(to_right,rgba(0,255,135,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 80%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 80%)' }} />

                  <PitchSVG />

                  {/* 3D Players layer */}
                  <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
                    {squad11.map((p, i) => (
                      <motion.div 
                        key={p.name}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: p.delay, duration: 0.6, type: "spring" }}
                        className="absolute cursor-pointer group hover:!z-[999]"
                        style={{ left: p.left, top: p.top, zIndex: p.z, transformStyle: 'preserve-3d' }}
                      >
                        {/* STAND-UP counter-rotation WITH explicit absolute center constraints */}
                        <div 
                          className="absolute flex flex-col items-center"
                          style={{ 
                            transform: 'translateX(-50%) translateY(-100%) rotateX(-55deg)',
                            transformOrigin: 'bottom center'
                          }}
                        >
                          {/* Player Card (Unified sizes for true near-orthographic 3D effect) */}
                          <div className="relative w-14 h-20 sm:w-20 sm:h-28 bg-gradient-to-t from-[#1A1F2B] to-[#0A0E17]/50 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-110 group-hover:border-[#00FF87]/50 group-hover:-translate-y-6 bg-[#00FF87]/10">
                            <img 
                              src={`https://resources.premierleague.com/premierleague/photos/players/110x140/${p.imgUrl}`}
                              alt={p.name} 
                              className="object-contain w-[140%] h-[140%] drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] translate-y-2 pointer-events-none" 
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'; }}
                            />
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                          </div>
                          
                          {/* Name Label */}
                          <div className="absolute -bottom-5 bg-black/90 border border-white/20 px-3 py-1 rounded-md shadow-2xl transition-transform duration-300 group-hover:scale-110 group-hover:border-[#00FF87]">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-white tracking-widest whitespace-nowrap">{p.name}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          <AnimatedStep
            subheader="Крок 2: Живі дані"
            title="Ваші гравці. Реальні матчі."
            desc="Отримуй очки щоразу, коли твої гравці забивають, асистують або зберігають ворота сухими в реальному житті. Результати безпомилково синхронізуються через офіційний API Прем'єр-ліги."
            reverse
            visual={
              <div className="relative w-full aspect-square md:aspect-[4/3] flex items-center justify-center p-4">
                {/* Glowing background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,135,0.15)_0%,transparent_60%)] pointer-events-none" />
                
                {/* Live Match Widget Container */}
                <motion.div 
                  className="relative w-full max-w-sm rounded-2xl bg-[#0A0E17]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Scoreboard Header */}
                  <div className="w-full bg-gradient-to-b from-black/60 to-transparent p-4 border-b border-white/5 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-500 text-[10px] font-black tracking-widest uppercase">Live 72'</span>
                    </div>
                    <div className="flex items-center justify-between w-full px-6">
                      <span className="text-xl font-black text-white">ARS</span>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-display font-black text-white/50">0</span>
                        <span className="text-white/30 font-bold">-</span>
                        <span className="text-3xl font-display font-black text-[#6CABDD]">2</span>
                      </div>
                      <span className="text-xl font-black text-white/50">MCI</span>
                    </div>
                  </div>

                  {/* Event Feed */}
                  <div className="p-4 space-y-3 relative overflow-hidden h-[220px]">
                    {/* Event 1 */}
                    <motion.div 
                      className="w-full bg-gradient-to-r from-[#6CABDD]/20 to-transparent border-l-2 border-[#6CABDD] rounded-r-lg p-3 flex justify-between items-center"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⚽️</span>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">E. Haaland</span>
                          <span className="text-white/50 text-[10px] uppercase tracking-wider">Гол (Нападник)</span>
                        </div>
                      </div>
                      <span className="text-[#6CABDD] font-black text-lg">+5</span>
                    </motion.div>

                    {/* Event 2 */}
                    <motion.div 
                      className="w-full bg-gradient-to-r from-[#6CABDD]/20 to-transparent border-l-2 border-[#6CABDD] rounded-r-lg p-3 flex justify-between items-center"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8, duration: 0.4 }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">👟</span>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">P. Foden</span>
                          <span className="text-white/50 text-[10px] uppercase tracking-wider">Асист (Півзахисник)</span>
                        </div>
                      </div>
                      <span className="text-[#6CABDD] font-black text-lg">+3</span>
                    </motion.div>
                    
                    {/* Event 3 */}
                    <motion.div 
                      className="w-full bg-gradient-to-r from-red-500/20 to-transparent border-l-2 border-red-500 rounded-r-lg p-3 flex justify-between items-center"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3, duration: 0.4 }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🟨</span>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">W. Saliba</span>
                          <span className="text-white/50 text-[10px] uppercase tracking-wider">Жовта Картка</span>
                        </div>
                      </div>
                      <span className="text-red-500 font-black text-lg">-1</span>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            }
          />
          
        </div>
      </section>

      {/* ═══════════════════ SECTION C: INTERACTIVE SCORING ENGINE ══════════════ */}
      <section id="scoring" className="relative px-6 sm:px-10 lg:px-16 py-32 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.05)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-16 md:gap-8">
          
          {/* Header Left (Sticky) */}
          <div className="md:w-1/3">
            <div className="sticky top-32">
              <span className="text-[#F5A623] text-sm font-bold tracking-[0.2em] uppercase">
                Правила Гри
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-[1.1] mt-4 mb-6">
                Система Очок
              </h2>
              <p className="text-white/50 text-base leading-relaxed">
                Дізнайтесь, як ваші футболісти здобувають або втрачають переможні бали в режимі реального часу.
              </p>
            </div>
          </div>

          {/* Accordion List Right */}
          <div className="md:w-2/3 space-y-4 relative z-10">
            <ScoringAccordion
              isOpen={openAccordion === 0}
              onClick={() => setOpenAccordion(openAccordion === 0 ? null : 0)}
              title="Атака"
              subtitle="Голи та результативні передачі"
              icon="⚽️"
              rules={attackRules}
            />
            <ScoringAccordion
              isOpen={openAccordion === 1}
              onClick={() => setOpenAccordion(openAccordion === 1 ? null : 1)}
              title="Захист"
              subtitle="Сухі матчі та сейви воротаря"
              icon="🛡️"
              rules={defenseRules}
            />
            <ScoringAccordion
              isOpen={openAccordion === 2}
              onClick={() => setOpenAccordion(openAccordion === 2 ? null : 2)}
              title="Штрафи"
              subtitle="Помилки, пропущені голи та картки"
              icon="🟥"
              rules={penaltyRules}
            />
            <ScoringAccordion
              isOpen={openAccordion === 3}
              onClick={() => setOpenAccordion(openAccordion === 3 ? null : 3)}
              title="База та Бонуси"
              subtitle="Ігровий час та спеціальні нагороди"
              icon="🏆"
              rules={baseRules}
            />
          </div>
          
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
