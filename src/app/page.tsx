"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, animate } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getConfig, getGameweek } from "@/lib/aptos";
import { octasToMOVE } from "@/lib/utils";
import { RewardsLeaderboardTable } from "@/components/RewardsLeaderboardTable";

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/25 text-[#00F0FF] text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />
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

// ═══════════════════════════════════════════════════════════════════════════════

// ─── Live Data Carousel (Swipeable) ──────────────────────────────────────────
const CAROUSEL_MATCHES = [
  {
    league: "Premier League",
    time: "74:12",
    statusText: "LIVE",
    halfText: "2nd Half",
    scoreH: 2,
    scoreA: 1,
    teamH: { name: "MANCHESTER CITY", short: "MNC", badge: "https://resources.premierleague.com/premierleague/badges/t43.png", color: "#87CEEB" },
    teamA: { name: "ARSENAL", short: "ARS", badge: "https://resources.premierleague.com/premierleague/badges/t3.png", color: "#EF0107" },
    stadium: "Etihad Stadium",
    matchday: 26,
    events: [
      { player: "E. Haaland", action: "Goal!", pts: "+5", color: "#00e676", icon: "⚽️", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223094.png" },
      { player: "P. Foden", action: "Assist", pts: "+3", color: "#00F0FF", icon: "👟", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p209244.png" },
      { player: "B. Saka", action: "Yellow Card", pts: "-1", color: "#F5A623", icon: "🟨", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223340.png" }
    ]
  },
  {
    league: "Premier League",
    time: "FT",
    statusText: "FINISHED",
    halfText: "",
    scoreH: 1,
    scoreA: 3,
    teamH: { name: "TOTTENHAM", short: "TOT", badge: "https://resources.premierleague.com/premierleague/badges/t6.png", color: "#FFFFFF" },
    teamA: { name: "CHELSEA", short: "CHE", badge: "https://resources.premierleague.com/premierleague/badges/t8.png", color: "#034694" },
    stadium: "Hotspur Stadium",
    matchday: 26,
    events: [
      { player: "C. Palmer", action: "2 Goals", pts: "+10", color: "#00e676", icon: "⚽️⚽️", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p214285.png" },
      { player: "P. Porro", action: "Clean Tackle", pts: "+1", color: "#00F0FF", icon: "🛡", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p441164.png" },
      { player: "S. Heung-Min", action: "Goal!", pts: "+4", color: "#00e676", icon: "⚽️", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p85971.png" }
    ]
  },
  {
    league: "Premier League",
    time: "24:00",
    statusText: "LIVE",
    halfText: "1st Half",
    scoreH: 0,
    scoreA: 0,
    teamH: { name: "EVERTON", short: "EVE", badge: "https://resources.premierleague.com/premierleague/badges/t11.png", color: "#003399" },
    teamA: { name: "LIVERPOOL", short: "LIV", badge: "https://resources.premierleague.com/premierleague/badges/t14.png", color: "#C8102E" },
    stadium: "Goodison Park",
    matchday: 26,
    events: [
      { player: "J. Pickford", action: "3 Saves", pts: "+2", color: "#00F0FF", icon: "🧤", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p111234.png" },
      { player: "T. Alex-Arnold", action: "Key Pass", pts: "+1", color: "#00F0FF", icon: "🎯", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p169187.png" },
      { player: "J. Branthwaite", action: "Clean Sheet HT", pts: "+2", color: "#00e676", icon: "🛡", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p437746.png" }
    ]
  }
];

const ALL_PLAYERS = [
  { player: "J. Pickford", stats: [{icon: "🧤", text: "3 Saves"}, {icon: "🛡", text: "Clean Sheet"}], pts: "+7 PTS", color: "#00F0FF", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p111234.png" },
  { player: "M. Cucurella", stats: [{icon: "🛡", text: "Clean Tackle"}, {icon: "⏱", text: "90+ Mins"}], pts: "+6 PTS", color: "#A855F7", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p179268.png" },
  { player: "W. Saliba", stats: [{icon: "🛡", text: "Clean Sheet"}, {icon: "⏱", text: "90+ Mins"}], pts: "+8 PTS", color: "#00e676", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p462424.png" },
  { player: "Gabriel M.", stats: [{icon: "🛡", text: "Clean Sheet"}, {icon: "🟨", text: "Yellow Card"}], pts: "+6 PTS", color: "#00F0FF", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p226597.png" },
  { player: "P. Porro", stats: [{icon: "👟", text: "Assist"}, {icon: "🛡", text: "Clean Tackle"}], pts: "+9 PTS", color: "#00F0FF", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p441164.png" },
  { player: "B. Guimarães", stats: [{icon: "⚽️", text: "Goal"}, {icon: "⏱", text: "90+ Mins"}], pts: "+11 PTS", color: "#00e676", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p208706.png" },
  { player: "C. Palmer", stats: [{icon: "⚽️⚽️", text: "2 Goals"}, {icon: "🌟", text: "MOTM"}], pts: "+12 PTS", color: "#FFD700", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p244851.png" },
  { player: "P. Foden", stats: [{icon: "👟", text: "Assist"}, {icon: "⚡️", text: "Key Pass"}], pts: "+8 PTS", color: "#00F0FF", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p209244.png" },
  { player: "O. Watkins", stats: [{icon: "⚽️", text: "Goal"}, {icon: "👟", text: "Assist"}], pts: "+15 PTS", color: "#00e676", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p178301.png" },
  { player: "E. Haaland", stats: [{icon: "⚽️⚽️", text: "2 Goals"}, {icon: "⏱", text: "90+ Mins"}], pts: "+18 PTS", color: "#00e676", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223094.png" },
  { player: "B. Saka", stats: [{icon: "⚽️", text: "Goal"}, {icon: "⚡️", text: "Key pass"}], pts: "+14 PTS", color: "#00e676", image: "https://resources.premierleague.com/premierleague/photos/players/110x140/p223340.png" },
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
                    {slide.halfText && <><span className="text-white/20">•</span> <span className="text-[#00F0FF]">{slide.halfText}</span></>}
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
           <button key={i} onClick={() => setActiveIndex(i)} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-500 ${i === activeIndex ? "bg-[#00F0FF] w-6 sm:w-8 shadow-[0_0_10px_rgba(0,240,255,1)]" : "bg-white/20 hover:bg-white/40"}`} />
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
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#00F0FF] opacity-60 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
                <div className="relative bg-[#0D0F12] border border-white/10 text-white px-10 py-4 w-full sm:w-auto sm:min-w-[260px] rounded-2xl font-display font-black uppercase tracking-widest text-lg text-center flex items-center justify-center gap-2">
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
      <section id="how-it-works" className="relative px-6 sm:px-10 lg:px-16 py-20 overflow-hidden bg-gradient-to-b from-[#0D0F12] via-[#121620] to-[#0D0F12]">
        <div className="max-w-7xl mx-auto space-y-24">
          
          <AnimatedStep
            subheader="Крок 1: Твоя тактика"
            title="Збирай свій склад"
            desc="У тебе є можливість зібрати 11 найкращих гравців з Англійської Прем'єр-ліги. Зроби трансфери, обери капітана та розстав пріоритети на полі. Твоє рішення безповоротно фіксується смарт-контрактом."
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
        <div id="step-2" className="mt-8 md:mt-16 w-full max-w-[1600px] mx-auto relative z-10 flex flex-col items-center">
          {/* Glowing background behind step 2 */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.08)_0%,transparent_50%)] pointer-events-none" />
          
          <div className="w-full max-w-4xl mx-auto px-4 text-center mb-6 sm:mb-10 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-3 sm:mb-4">
                <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]"></span>
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold tracking-widest text-[#00F0FF] uppercase">
                  Крок 2: Живі дані
                </span>
              </div>
              <h3 className="text-3xl sm:text-4xl md:text-6xl font-display font-black text-white leading-tight mb-3 sm:mb-4 tracking-tight">
                Ваші гравці. <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">Реальні матчі.</span>
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-white/50 max-w-3xl mx-auto leading-relaxed">
                Отримуй очки щоразу, коли твої гравці забивають, асистують або зберігають ворота сухими.
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
            className="relative z-10 w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 mx-auto flex flex-col items-center"
          >
            {/* Content: Left=Chest, Right=Table */}
            <RewardsLeaderboardTable totalPool={prizePool} />
          </motion.div>
        </section>
          
        </div>
      </section>

      {/* ═══════════════════ SECTION C: INTERACTIVE SCORING ENGINE ══════════════ */}
      <section id="scoring" className="relative px-6 sm:px-10 lg:px-16 py-20 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.05)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 md:gap-12">
          
          {/* Header Left (Sticky) */}
          <div className="md:w-2/5">
            <div className="sticky top-32">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                Правила Гри
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-[1.1] mt-4 mb-6">
                Система Очок
              </h2>
              <p className="text-white/50 text-base leading-relaxed">
                Дізнайтесь, як ваші футболісти здобувають або втрачають переможні бали в режимі реального часу.
              </p>
            </div>
          </div>

          {/* Elegant Dark Card Scoring Grid Right */}
          <div className="md:w-3/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              
              {/* Attack Column */}
              <div className="bg-[#141517] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                <div className="p-6 border-b border-white/[0.04]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-xl">⚽️</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Атака</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Голи та результативні передачі</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 px-6">
                  <ul className="space-y-3.5">
                    {attackRules.map((r) => (
                      <li key={r.label} className="flex justify-between items-center text-sm">
                        <span className="text-white/60">{r.label}</span>
                        <span className={`font-black tracking-wide ${r.color}`}>{r.pts}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Defense Column */}
              <div className="bg-[#141517] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                <div className="p-6 border-b border-white/[0.04]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-xl">🛡️</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Захист</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Сухі матчі та сейви воротаря</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 px-6">
                  <ul className="space-y-3.5">
                    {defenseRules.map((r) => (
                      <li key={r.label} className="flex justify-between items-center text-sm">
                        <span className="text-white/60">{r.label}</span>
                        <span className={`font-black tracking-wide ${r.color}`}>{r.pts}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Penalty Column */}
              <div className="bg-[#141517] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                <div className="p-6 border-b border-white/[0.04]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
                      <span className="text-xl">🟥</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Штрафи</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Помилки, пропущені голи, картки</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 px-6">
                  <ul className="space-y-3.5">
                    {penaltyRules.map((r) => (
                      <li key={r.label} className="flex justify-between items-center text-sm">
                        <span className="text-white/60">{r.label}</span>
                        <span className={`font-black tracking-wide ${r.color}`}>{r.pts}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Base & Bonus Column */}
              <div className="bg-[#141517] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                <div className="p-6 border-b border-white/[0.04]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                      <span className="text-xl">🏆</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#8B5CF6] uppercase tracking-wider mb-1">Активи та Бонуси</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Ігровий час та спеціальні нагороди</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 px-6">
                  <ul className="space-y-3.5">
                    {baseRules.map((r) => (
                      <li key={r.label} className="flex justify-between items-center text-sm">
                        <span className="text-white/60">{r.label}</span>
                        <span className={`font-black tracking-wide ${r.color}`}>{r.pts}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </section>

      {/* ═══════════════════ SECTION D: TALENTS TEASER ══════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 py-10">
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
