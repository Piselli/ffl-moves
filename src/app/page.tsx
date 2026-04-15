"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, animate } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getConfig, getGameweek } from "@/lib/aptos";
import { octasToMOVE } from "@/lib/utils";
import { RewardsLeaderboardTable } from "@/components/RewardsLeaderboardTable";

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownTimer({ targetTime, gwId }: { targetTime: string; gwId: number }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  if (!timeLeft) return <span className="text-white/20 animate-pulse text-lg">—</span>;

  const units = [
    { v: timeLeft.d, l: "д" },
    { v: timeLeft.h, l: "г" },
    { v: timeLeft.m, l: "хв" },
    { v: timeLeft.s, l: "с" },
  ];

  return (
    <div className="flex flex-col items-start">
      <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1">
        До дедлайну GW{gwId}
      </p>
      {expired ? (
        <span className="text-white/40 text-sm font-bold">Дедлайн пройшов</span>
      ) : (
        <div className="flex items-end gap-1.5">
          {units.map(({ v, l }, i) => (
            <div key={l} className="flex items-baseline gap-0.5">
              <span className="font-display font-black text-xl sm:text-2xl text-white tabular-nums leading-none">
                {String(v).padStart(2, "0")}
              </span>
              <span className="text-[9px] text-white/30 uppercase tracking-wider">{l}</span>
              {i < units.length - 1 && <span className="text-white/20 font-black text-lg ml-0.5">:</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C46A]/10 border border-[#00C46A]/25 text-[#00C46A] text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A]" />
            {subheader}
          </div>
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
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 650 1000" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Subtle grass shadowing */}
        <radialGradient id="pitchGlow" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
        </radialGradient>
      </defs>

      {/* Surface ambient darkening */}
      <rect x="0" y="0" width="650" height="1000" fill="url(#pitchGlow)" rx="2" />

      {/* Realistic Solid White Lines WITHOUT extra margins */}
      <g stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Pitch Outer Bounds */}
        <rect x="0" y="0" width="650" height="1000" />
        {/* Center Line */}
        <line x1="0" y1="500" x2="650" y2="500" />
        {/* Center Circle */}
        <circle cx="325" cy="500" r="90" />
        <circle cx="325" cy="500" r="3" fill="rgba(255,255,255,0.75)" />
        
        {/* Penalty Box (Bottom) */}
        <rect x="125" y="850" width="400" height="150" />
        {/* Goal Area (Bottom) */}
        <rect x="235" y="940" width="180" height="60" />
        <circle cx="325" cy="900" r="3" fill="rgba(255,255,255,0.75)" />
        {/* Penalty Arc (Bottom) */}
        <path d="M 265 850 A 70 70 0 0 0 385 850" />
        
        {/* Penalty Box (Top) */}
        <rect x="125" y="0" width="400" height="150" />
        {/* Goal Area (Top) */}
        <rect x="235" y="0" width="180" height="60" />
        <circle cx="325" cy="100" r="3" fill="rgba(255,255,255,0.75)" />
        {/* Penalty Arc (Top) */}
        <path d="M 265 150 A 70 70 0 0 1 385 150" />
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
      <div className="mb-0.5 z-10 text-[0px]"> {/* closer to the card */}
        <div className="px-2 py-0.5 rounded-full bg-[#00e676] text-black text-[11px] font-black font-display shadow-lg shadow-[#00e676]/30 leading-none">
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
      <div className="-mt-1 text-center"> {/* Pulled up slightly */}
        <div className="text-[10px] font-bold text-white/90 uppercase tracking-wider leading-none bg-[#0D0F12]/95 border border-white/[0.12] px-2 py-0.5 rounded shadow-lg">
          {name}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Position Scoring Cards ───────────────────────────────────────────────────
// Position-specific scoring only (universal bonuses/penalties shown separately below)
const POSITION_CARDS = [
  {
    pos: "ВР", posEn: "GK",
    player: "Jordan Pickford", img: "p111234.png",
    color: "#F43F5E", colorClass: "text-rose-400", bgClass: "bg-rose-500/15", borderClass: "border-rose-500/40",
    gains: [
      { label: "Гол",                 pts: "+10" },
      { label: "Відбитий пенальті",   pts: "+5"  },
      { label: "Суха пара",           pts: "+4"  },
      { label: "Асист",               pts: "+3"  },
      { label: "Кожні 3 сейви",       pts: "+1"  },
      { label: "Пропущений гол (×2)", pts: "−1", negative: true },
    ],
  },
  {
    pos: "ЗАХ", posEn: "DEF",
    player: "William Saliba", img: "p462424.png",
    color: "#F59E0B", colorClass: "text-amber-400", bgClass: "bg-amber-500/15", borderClass: "border-amber-500/40",
    gains: [
      { label: "Гол",                 pts: "+6" },
      { label: "Суха пара",           pts: "+4" },
      { label: "Асист",               pts: "+3" },
      { label: "Пропущений гол (×2)", pts: "−1", negative: true },
    ],
  },
  {
    pos: "ПЗ", posEn: "MID",
    player: "Cole Palmer", img: "p244851.png",
    color: "#3B82F6", colorClass: "text-blue-400", bgClass: "bg-blue-500/15", borderClass: "border-blue-500/40",
    gains: [
      { label: "Гол",       pts: "+5" },
      { label: "Асист",     pts: "+3" },
      { label: "Суха пара", pts: "+1" },
    ],
  },
  {
    pos: "НАП", posEn: "FWD",
    player: "Erling Haaland", img: "p223094.png",
    color: "#10B981", colorClass: "text-emerald-400", bgClass: "bg-emerald-500/15", borderClass: "border-emerald-500/40",
    gains: [
      { label: "Гол",   pts: "+5" },
      { label: "Асист", pts: "+3" },
    ],
  },
];

const UNIVERSAL_BONUSES = [
  { label: "Гравець матчу (BPS)", pts: "+3", color: "text-[#00C46A]" },
  { label: "Хет-трик",           pts: "+3", color: "text-[#00C46A]" },
  { label: "Вихід 60+ хв",       pts: "+2", color: "text-[#00C46A]" },
  { label: "Вихід 1–59 хв",      pts: "+1", color: "text-[#00C46A]" },
];

const UNIVERSAL_PENALTIES = [
  { label: "Червона картка",      pts: "−3" },
  { label: "Автогол",             pts: "−2" },
  { label: "Незабитий пенальті",  pts: "−2" },
  { label: "Жовта картка",        pts: "−1" },
];

// ═══════════════════════════════════════════════════════════════════════════════

// ─── Live Data Carousel (Swipeable) ──────────────────────────────────────────
const CAROUSEL_MATCHES = [
  {
    league: "Premier League",
    time: "74:12",
    statusText: "LIVE",
    halfText: "2-й тайм",
    scoreH: 2,
    scoreA: 1,
    teamH: { name: "MANCHESTER CITY", short: "MNC", badge: "https://resources.premierleague.com/premierleague/badges/t43.png", color: "#87CEEB" },
    teamA: { name: "ARSENAL", short: "ARS", badge: "https://resources.premierleague.com/premierleague/badges/t3.png", color: "#EF0107" },
    stadium: "Etihad Stadium",
    matchday: 26,
    events: [
      { player: "E. Haaland", action: "Гол!", pts: "+5", color: "#00C46A", icon: "⚽️", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223094.png" },
      { player: "P. Foden", action: "Асист", pts: "+3", color: "#00C46A", icon: "👟", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p209244.png" },
      { player: "B. Saka", action: "Жовта картка", pts: "-1", color: "#F87171", icon: "🟨", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223340.png" }
    ]
  },
  {
    league: "Premier League",
    time: "FT",
    statusText: "ЗАВЕРШЕНО",
    halfText: "",
    scoreH: 1,
    scoreA: 3,
    teamH: { name: "TOTTENHAM", short: "TOT", badge: "https://resources.premierleague.com/premierleague/badges/t6.png", color: "#FFFFFF" },
    teamA: { name: "CHELSEA", short: "CHE", badge: "https://resources.premierleague.com/premierleague/badges/t8.png", color: "#034694" },
    stadium: "Hotspur Stadium",
    matchday: 26,
    events: [
      { player: "C. Palmer", action: "2 Голи", pts: "+10", color: "#00C46A", icon: "⚽️⚽️", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p214285.png" },
      { player: "P. Porro", action: "Відбір", pts: "+1", color: "#00C46A", icon: "🛡", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p441164.png" },
      { player: "S. Heung-Min", action: "Гол!", pts: "+4", color: "#00C46A", icon: "⚽️", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p85971.png" }
    ]
  },
  {
    league: "Premier League",
    time: "24:00",
    statusText: "LIVE",
    halfText: "1-й тайм",
    scoreH: 0,
    scoreA: 0,
    teamH: { name: "EVERTON", short: "EVE", badge: "https://resources.premierleague.com/premierleague/badges/t11.png", color: "#003399" },
    teamA: { name: "LIVERPOOL", short: "LIV", badge: "https://resources.premierleague.com/premierleague/badges/t14.png", color: "#C8102E" },
    stadium: "Goodison Park",
    matchday: 26,
    events: [
      { player: "J. Pickford", action: "3 Сейви", pts: "+2", color: "#00C46A", icon: "🧤", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p111234.png" },
      { player: "T. Alex-Arnold", action: "Ключ. пас", pts: "+1", color: "#00C46A", icon: "🎯", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p169187.png" },
      { player: "J. Branthwaite", action: "Суха пара", pts: "+2", color: "#00C46A", icon: "🛡", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p437746.png" }
    ]
  }
];

const ALL_PLAYERS = [
  { player: "J. Pickford", stats: [{icon: "🧤", text: "3 Сейви"}, {icon: "🛡", text: "Суха пара"}], pts: "+7 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p111234.png" },
  { player: "M. Cucurella", stats: [{icon: "🛡", text: "Відбір"}, {icon: "⏱", text: "90+ хв"}], pts: "+6 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p179268.png" },
  { player: "W. Saliba", stats: [{icon: "🛡", text: "Суха пара"}, {icon: "⏱", text: "90+ хв"}], pts: "+8 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p462424.png" },
  { player: "Gabriel M.", stats: [{icon: "🛡", text: "Суха пара"}, {icon: "🟨", text: "Жовта картка"}], pts: "+6 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p226597.png" },
  { player: "P. Porro", stats: [{icon: "👟", text: "Асист"}, {icon: "🛡", text: "Відбір"}], pts: "+9 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p441164.png" },
  { player: "B. Guimarães", stats: [{icon: "⚽️", text: "Гол"}, {icon: "⏱", text: "90+ хв"}], pts: "+11 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p208706.png" },
  { player: "C. Palmer", stats: [{icon: "⚽️⚽️", text: "2 Голи"}, {icon: "🌟", text: "ГМ"}], pts: "+12 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p244851.png" },
  { player: "P. Foden", stats: [{icon: "👟", text: "Асист"}, {icon: "⚡️", text: "Ключ. пас"}], pts: "+8 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p209244.png" },
  { player: "O. Watkins", stats: [{icon: "⚽️", text: "Гол"}, {icon: "👟", text: "Асист"}], pts: "+15 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p178301.png" },
  { player: "E. Haaland", stats: [{icon: "⚽️⚽️", text: "2 Голи"}, {icon: "⏱", text: "90+ хв"}], pts: "+18 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223094.png" },
  { player: "B. Saka", stats: [{icon: "⚽️", text: "Гол"}, {icon: "⚡️", text: "Ключ. пас"}], pts: "+14 ОЧК", color: "#00C46A", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223340.png" },
];

function LiveDataCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CAROUSEL_MATCHES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = CAROUSEL_MATCHES[activeIndex];
  const marqueePlayers = [...ALL_PLAYERS, ...ALL_PLAYERS];

  return (
    <div className="relative w-full flex flex-col items-center">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      {/* Container for both panels */}
      <div className="relative w-full rounded-[2.5rem] bg-[#0A0D14]/90 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col xl:flex-row p-3 sm:p-4 md:p-5 lg:p-6 gap-3 md:gap-4 lg:gap-5 overflow-hidden items-stretch mb-4">
        
        {/* TOP/LEFT: Live Match Panel */}
        <div className="w-full xl:w-[35%] h-auto min-h-[300px] flex flex-col bg-gradient-to-br from-white/[0.05] to-transparent rounded-[1.5rem] border border-white/5 p-4 sm:p-5 md:p-6 relative overflow-hidden justify-between shrink-0">
          {/* (Glow removed) */}
          
          <div className="flex flex-col flex-1 w-full relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeIndex + "left"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center relative w-full h-full"
              >
                {/* Match Status Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full mb-4 sm:mb-5">
                  {slide.statusText === "LIVE" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mt-px" />}
                  <span className={`text-[9px] font-bold tracking-[0.15em] uppercase leading-none flex items-center gap-1.5 ${slide.statusText === "LIVE" ? "text-red-500" : "text-white/40"}`}>
                    {slide.statusText} 
                    {slide.halfText && <><span className="text-white/20">•</span> <span className="text-[#00C46A]">{slide.halfText}</span></>}
                    <span className="text-white/20">•</span> <span className="text-white tracking-widest">{slide.time}</span>
                  </span>
                </div>

                <div className="flex flex-row items-center justify-between w-full relative">
                  {/* Team Home */}
                  <div className="flex flex-col items-center z-10 w-[30%] min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex shrink-0 items-center justify-center mb-2">
                      <img src={slide.teamH.badge} alt={slide.teamH.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 relative z-10" />
                    </div>
                    <span className="text-white font-black text-lg lg:text-xl font-display tracking-wider text-center uppercase">{slide.teamH.short}</span>
                  </div>
                  
                  {/* Center Info - BIG SCORE */}
                  <div className="flex flex-col items-center justify-center z-10 w-[40%] min-w-0 mb-3">
                    <div className="text-5xl sm:text-6xl md:text-7xl font-display font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none flex items-center justify-center w-full transition-all duration-300">
                      {slide.scoreH}<span className="text-white/10 mx-2 sm:mx-3 font-normal">-</span>{slide.scoreA}
                    </div>
                  </div>
                  
                  {/* Team Away */}
                  <div className="flex flex-col items-center text-center w-[30%] min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center mb-2">
                      <img src={slide.teamA.badge} alt={slide.teamA.short} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col mt-0 w-full">
                      <span className="text-white font-black text-lg lg:text-xl font-display tracking-wider text-center uppercase">{slide.teamA.short}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Static Location (Not animated so it stays still) */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 text-white/50 text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.15em] mt-auto pt-4 md:pt-6 border-t border-white/5 font-medium w-full relative z-10">
            <div className="flex items-center gap-1 md:gap-1.5">
              <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Matchday 26
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <AnimatePresence mode="wait">
                <motion.span
                  key={slide.stadium}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >{slide.stadium}</motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT: MARQUEE PLAYER FEED */}
        <div className="w-full xl:w-[68%] min-h-[300px] flex flex-col bg-[#0D1017] rounded-[1.5rem] border border-white/5 p-0 relative shadow-inner overflow-hidden justify-center items-center">
          
          <div className="flex-1 w-full relative overflow-hidden flex items-center h-[300px]">
            <div className="flex gap-4 sm:gap-5 w-max animate-[marquee_50s_linear_infinite] px-4 sm:px-6 hover:[animation-play-state:paused] items-center h-full">
              {marqueePlayers.map((ev, i) => (
                 <div key={i} className="flex flex-col items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] p-4 sm:p-5 rounded-2xl border border-white/10 transition-all duration-300 w-[200px] sm:w-[240px] md:w-[260px] h-[250px] shrink-0 group relative overflow-hidden backdrop-blur-md">
                   {/* Background Glow */}
                   <div className="absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-40" style={{ backgroundColor: ev.color }} />
                   
                   <img src={ev.image} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 bg-[#0A0D14] object-cover object-top shrink-0 transition-transform duration-300 group-hover:scale-110 mb-2" style={{ borderColor: ev.color, boxShadow: `0 0 15px ${ev.color}4D` }} alt={ev.player} />
                   
                   <span className="text-white font-black text-base sm:text-lg tracking-wide truncate text-center w-full mb-2">{ev.player}</span>
                   
                   {/* Multiple Player Stats Line */}
                   <div className="flex flex-col gap-1 w-full mb-3 px-2">
                     {ev.stats.map((stat: any, idx: number) => (
                       <div key={idx} className="flex items-center justify-between w-full opacity-80 group-hover:opacity-100 transition-opacity">
                         <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/70 truncate">{stat.text}</span>
                         <span className="text-[9px] sm:text-[10px] font-bold" style={{ color: ev.color }}>{stat.icon}</span>
                       </div>
                     ))}
                   </div>

                   <div className="px-3 sm:px-4 py-1.5 sm:py-2 border rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:brightness-125 w-full mt-auto tracking-wider" style={{ borderColor: ev.color, backgroundColor: `${ev.color}1A`, boxShadow: `0 0 15px ${ev.color}40` }}>
                      <span className="text-sm sm:text-base font-black whitespace-nowrap" style={{ color: ev.color, textShadow: `0 0 12px ${ev.color}90` }}>{ev.pts}</span>
                   </div>
                 </div>
              ))}
            </div>
            {/* Edge Gradients for smooth fade in/out */}
            <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-[#0D1017] to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-[#0D1017] to-transparent pointer-events-none z-10" />
          </div>
        </div>
      </div>
      
      {/* Slider Dots */}
      <div className="flex items-center justify-center gap-2 md:gap-3 mt-1 md:mt-2">
        {CAROUSEL_MATCHES.map((_, i) => (
           <button key={i} onClick={() => setActiveIndex(i)} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-500 ${i === activeIndex ? "bg-[#00C46A] w-6 sm:w-8 shadow-[0_0_10px_rgba(0,196,106,0.8)]" : "bg-white/20 hover:bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {

  const { connected } = useWallet();

  // Live on-chain data
  const [prizePool, setPrizePool] = useState<number | null>(null);
  const [totalManagers, setTotalManagers] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Fixtures / deadline
  const [fixturesData, setFixturesData] = useState<any>(null);

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

  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setFixturesData(d); })
      .catch(() => {});
  }, []);

  // ── How It Works steps ─────────────────────────────────────────────────────
  const steps = [
    {
      num: "01",
      title: "Збери склад",
      desc: "Вибери 11 гравців з Англійської Прем'єр-ліги на поточний тур. Будь-який гравець, жодних обмежень бюджету.",
      accent: "from-[#00C46A] to-[#0077FF]",
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



  // ── 11-Man Squad for hero pitch (Broadcast Style Formation)
  const squad11 = [
    // GK - В воротарській
    { name: "Pickford", pos: "GK", pts: 7, imgUrl: "p111234.png", left: "50%", top: "99%", z: 10, delay: 0.1 },
    // DEF — Строго в ряд
    { name: "Cucurella", pos: "DEF", pts: 6, imgUrl: "p179268.png", left: "15%", top: "80%", z: 20, delay: 0.2 },
    { name: "Saliba", pos: "DEF", pts: 8, imgUrl: "p462424.png", left: "38.3%", top: "80%", z: 20, delay: 0.3 },
    { name: "Gabriel", pos: "DEF", pts: 6, imgUrl: "p226597.png", left: "61.6%", top: "80%", z: 20, delay: 0.4 },
    { name: "Porro", pos: "DEF", pts: 9, imgUrl: "p441164.png", left: "85%", top: "80%", z: 20, delay: 0.5 },
    // MID — Бруно, Палмер, Фоден (строго в ряд)
    { name: "Bruno", pos: "MID", pts: 11, imgUrl: "p208706.png", left: "25%", top: "56%", z: 30, delay: 0.6 },
    { name: "Palmer", pos: "MID", pts: 12, imgUrl: "p244851.png", left: "50%", top: "56%", z: 30, delay: 0.7 },
    { name: "Foden", pos: "MID", pts: 8, imgUrl: "p209244.png", left: "75%", top: "56%", z: 30, delay: 0.8 },
    // FWD — Строго в ряд
    { name: "Watkins", pos: "FWD", pts: 15, imgUrl: "p178301.png", left: "25%", top: "32%", z: 40, delay: 0.9 },
    { name: "Haaland", pos: "FWD", pts: 18, imgUrl: "p223094.png", left: "50%", top: "32%", z: 40, delay: 1.0 },
    { name: "Saka", pos: "FWD", pts: 14, imgUrl: "p223340.png", left: "75%", top: "32%", z: 40, delay: 1.1 },
  ];

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-[#0D0F12] text-white overflow-x-hidden min-h-screen">

      {/* ═══════════════════ SECTION A: HERO ═══════════════════════════════════ */}
      <section className="relative min-h-[85vh] flex flex-col justify-center px-6 sm:px-10 lg:px-16 pt-[72px] pb-16">

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(0,196,106,0.06)_0%,transparent_60%)] pointer-events-none -z-10" />

        {/* ── Top/Left: Text ─────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-2xl flex flex-col gap-10">

          {/* Text Group */}
          <div className="flex flex-col gap-5">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl lg:text-5xl font-display font-black uppercase leading-[1.15] tracking-tight text-white pb-2"
            >
              Розбираєшся в АПЛ
              <br />
              <span className="text-[#00C46A]">краще за інших?</span>
              <br />
              Час на цьому заробити.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-lg text-white/50 leading-relaxed max-w-xl"
            >
              Аналізуй форму гравців і розклад туру.<br />
              Збери 11 стартовиків і 3 запасних.<br />
              Чим точніший твій вибір, тим більше MOVE на гаманець.
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
                  <Counter to={prizePool} suffix=" MOVE" decimals={1} />
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
            {fixturesData?.gameweek?.deadlineTime && (
              <div className="flex flex-col items-start bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl px-4 py-2 shadow-lg shadow-black/20">
                <CountdownTimer
                  targetTime={fixturesData.gameweek.deadlineTime}
                  gwId={fixturesData.gameweek.id}
                />
              </div>
            )}
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
                className="inline-flex items-center justify-center gap-2 px-10 py-5 w-full sm:w-auto sm:min-w-[280px] rounded-2xl font-display font-black uppercase tracking-widest text-lg bg-[#00C46A] text-black hover:brightness-110 hover:scale-[1.02] transition-all duration-200 shadow-[0_0_30px_rgba(0,196,106,0.35)]"
              >
                Почати змагатись
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <div
                className="relative group cursor-pointer inline-block w-full sm:w-auto"
                onClick={() => (document.getElementById('wallet-connect-btn') as HTMLButtonElement)?.click()}
              >
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#00C46A] opacity-60 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
                <div className="relative bg-[#0D0F12] border border-white/10 text-white px-10 py-4 w-full sm:w-auto sm:min-w-[260px] rounded-2xl font-display font-black uppercase tracking-widest text-lg text-center flex items-center justify-center gap-2">
                  <span>Почати змагатись</span>
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
      <section id="how-it-works" className="relative px-6 sm:px-10 lg:px-16 pt-20 pb-4 overflow-hidden" style={{ scrollMarginTop: '72px' }}>
        <div className="max-w-7xl mx-auto space-y-24">
          
          <AnimatedStep
            subheader="01 — Твій склад, твоя тактика"
            title="Весь склад АПЛ — твій вибір"
            desc="Аналізуй форму, дивись розклад і збирай склад з будь-яких гравців Англійської Прем'єр-ліги. 11 стартовиків і 3 запасних — твоє тактичне рішення на тур."
            visual={
              <div 
                className="relative w-full max-w-4xl mx-auto h-[450px] sm:h-[650px] flex items-center justify-center mt-10 mb-20 md:mb-0"
                style={{ perspective: '1800px' }}
              >
                {/* 3D Floor (The Pitch) — levitating tactical board */}
                <div 
                  className="absolute w-[95%] sm:w-[85%] h-[130%] origin-center"
                  style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: 'rotateX(55deg) scale(1.1)',
                  }}
                >
                  {/* 3D Realistic Striped Green Grass Surface */}
                  <div 
                    className="absolute inset-0 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
                    style={{
                      backgroundColor: '#388E3C', // Base emerald green
                      backgroundImage: `repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 50px,
                        rgba(0, 0, 0, 0.08) 50px,
                        rgba(0, 0, 0, 0.08) 100px
                      )`,
                      border: '4px solid #2E7D32' // Darker green turf boundary
                    }}
                  />

                  <PitchSVG />

                  {/* 3D Players layer — overflow-visible so labels at edges show fully */}
                  <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', overflow: 'visible' }}>
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
                        {/* STAND-UP counter-rotation */}
                        <div 
                          className="absolute flex flex-col items-center"
                          style={{ 
                            transform: 'translateX(-50%) translateY(-100%) rotateX(-55deg)',
                            transformOrigin: 'bottom center'
                          }}
                        >
                          {/* HOVER WRAPPER: Both card and nameplate scale and move up together */}
                          <div className="flex flex-col items-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-4">
                            {/* Player Card */}
                            <div className="relative w-14 h-20 sm:w-16 sm:h-22 bg-gradient-to-t from-[#1A1F2B] to-[#0A0E17]/60 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-colors duration-300 group-hover:border-white/30">
                              <img 
                                src={`https://resources.premierleague.com/premierleague/photos/players/110x140/${p.imgUrl}`}
                                alt={p.name} 
                                className="object-contain w-[140%] h-[140%] drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] translate-y-2 pointer-events-none" 
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'; }}
                              />
                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                            </div>
                            
                            {/* Premium Dark Glassmorphism Nameplate */}
                            <div className="mt-1.5 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:bg-black/60 group-hover:border-white/30 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] z-10 flex items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] font-black uppercase text-white tracking-[0.15em] whitespace-nowrap leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{p.name}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

        {/* STEP 2: Cinematic Full-Width */}
        <div id="step-2" className="mt-8 md:mt-16 w-full mx-auto relative z-10 flex flex-col items-center">
          {/* subtle backdrop for step 2 — no color tint */}
          
          <div className="w-full max-w-4xl mx-auto px-4 text-center mb-6 sm:mb-10 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-3 sm:mb-4">
                <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#00C46A] shadow-[0_0_8px_#00C46A]"></span>
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold tracking-widest text-[#00C46A] uppercase">
                  02 — Очки в реальному часі
                </span>
              </div>
              <h3 className="text-3xl sm:text-4xl md:text-6xl font-display font-black text-white leading-tight mb-3 sm:mb-4 tracking-tight uppercase">
                Твої гравці. <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">Реальні матчі.</span>
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-white/50 max-w-3xl mx-auto leading-relaxed">
                Статистика надходить з офіційних джерел АПЛ. Кожна дія твоїх гравців на полі — твої очки.
              </p>
            </motion.div>
          </div>
          
          <div className="w-full px-2 sm:px-4 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <LiveDataCarousel />
            </motion.div>
          </div>
        </div>

        {/* ═══════════════════ STEP 3: REWARDS (SORARE STYLE) ═══════════════════ */}
        <section id="step-3" className="relative mt-8 md:mt-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full mx-auto flex flex-col items-center"
          >
            {/* Content: Left=Chest, Right=Table */}
            <RewardsLeaderboardTable totalPool={prizePool} />
          </motion.div>
        </section>
          
        </div>
      </section>

      {/* ═══════════════════ SECTION C: SCORING BY POSITION ════════════════════ */}
      <section id="scoring" className="relative px-6 sm:px-10 lg:px-16 pt-10 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05)_0%,transparent_65%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              Правила нарахування
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-[1.1] mb-2">
              Чим більше дій — тим більше очок
            </h2>
            <p className="text-white/40 text-sm leading-relaxed">
              Голи, асисти, сейви, суха пара, вихід на поле — все враховується. Кожна позиція має свою вагу.
            </p>
          </motion.div>

          {/* 4 Position Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
            {POSITION_CARDS.map((card, i) => (
              <motion.div
                key={card.posEn}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative bg-[#111214]/90 border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col group hover:border-white/[0.12] transition-colors duration-300"
              >
                {/* Top color accent */}
                <div className="h-0.5 w-full" style={{ backgroundColor: card.color, opacity: 0.7 }} />

                {/* Player header */}
                <div className="relative flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/[0.05]">
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/[0.08] bg-white/[0.04] relative z-10">
                    <img
                      src={`https://resources.premierleague.com/premierleague/photos/players/110x140/${card.img}`}
                      alt={card.player}
                      className="w-full h-full object-cover object-top scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className="relative z-10 min-w-0">
                    <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest mb-0.5 ${card.bgClass} border ${card.borderClass} ${card.colorClass}`}>
                      {card.pos}
                    </div>
                    <p className="text-xs font-bold text-white truncate leading-tight">{card.player}</p>
                  </div>
                </div>

                {/* Scoring rows — position-specific only */}
                <div className="flex-1 px-4 py-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-1.5 px-1">Бали за позицією</p>
                  <ul className="space-y-0.5">
                    {card.gains.map((g) => (
                      <li key={g.label} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-white/[0.03] transition-colors">
                        <span className="text-xs text-white/50">{g.label}</span>
                        <span className={`text-sm font-display font-black tabular-nums ${'negative' in g && g.negative ? 'text-rose-400/80' : 'text-[#00C46A]'}`}>{g.pts}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Макс. за тур</span>
                    <span className="text-sm font-display font-black tabular-nums text-[#00C46A]">
                      {card.gains.filter(g => !('negative' in g && g.negative)).reduce((s, g) => s + parseInt(g.pts), 0)} балів
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Universal rules row: Bonuses + Penalties */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
            {/* Penalties — all positions */}
            <div className="bg-[#111214]/90 border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xs">🟥</div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Штрафи</p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest">Для всіх позицій</p>
                </div>
              </div>
              <ul className="px-4 py-2 grid grid-cols-2 gap-x-4">
                {UNIVERSAL_PENALTIES.map((p) => (
                  <li key={p.label} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                    <span className="text-xs text-white/50">{p.label}</span>
                    <span className="text-sm font-display font-black tabular-nums text-rose-400">{p.pts}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bonuses — all positions */}
            <div className="bg-[#111214]/90 border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center text-xs">⭐</div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Загальні бонуси</p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest">Для всіх позицій</p>
                </div>
              </div>
              <ul className="px-4 py-2 grid grid-cols-2 gap-x-4">
                {UNIVERSAL_BONUSES.map((b) => (
                  <li key={b.label} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                    <span className="text-xs text-white/50">{b.label}</span>
                    <span className={`text-sm font-display font-black tabular-nums ${b.color}`}>{b.pts}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

        </div>
      </section>


      {/* ═══════════════════ SECTION E: TALENTS TEASER ══════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 pt-2 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-7xl mx-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden px-8 py-6 md:px-10 md:py-7"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 text-[10px] font-bold uppercase tracking-widest mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
                Незабаром
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-white/70 uppercase mb-2">
                Таланти
              </h2>
              <p className="text-white/35 text-sm leading-relaxed max-w-xl">
                Розблокуй унікальні <span className="text-white/55 font-semibold">Таланти</span>, які множать фінальні очки гравця на +5%, +10% або +15%. Один правильний вибір може перекинути весь лідерборд.
              </p>
            </div>

            {/* Multiplier pills */}
            <div className="shrink-0 flex flex-row md:flex-col gap-2">
              {["+5%", "+10%", "+15%"].map((m, i) => (
                <div key={m} className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center opacity-50">
                  <span className="text-base font-display font-black text-white/60">{m}</span>
                  <p className="text-[8px] text-white/20 uppercase tracking-widest mt-0.5">
                    {["Звичайний", "Рідкісний", "Епічний"][i]}
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
