"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { WC_GROUPS } from "@/components/wc/wcGroups";
import { WcFlagChip } from "@/components/wc/WcGroupCard";
import { WcHeroBracket } from "@/components/wc/WcHeroBracket";
import { BRACKET_LEFT, BRACKET_RIGHT } from "@/components/wc/wcBracket";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Brushed-metal masthead fill — the premium "foil" feel for the wordmark. */
const FOIL_FILL = "linear-gradient(180deg, #ffffff 0%, #eef1f5 44%, #b9bfca 100%)";
/** Warm trophy-gold fill for the host-nations line (matches the official lockup). */
const GOLD_FILL = "linear-gradient(180deg, #f8e7ad 0%, #e9c873 48%, #c79a3b 100%)";

const BRACKET_HEIGHT = 470;

const LEFT_GROUPS = WC_GROUPS.slice(0, 6); // A–F
const RIGHT_GROUPS = WC_GROUPS.slice(6); // G–L

/** One group as a tight chip: colour-coded letter + the four nation flags. */
function GroupChip({ letter, accent, teams }: (typeof WC_GROUPS)[number]) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0b0e13]/70 py-2.5 pl-2.5 pr-3.5 backdrop-blur-sm">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] font-wc-display text-2xl leading-none text-black/85"
        style={{ backgroundColor: accent }}
      >
        {letter}
      </span>
      <div className="flex items-center gap-1.5">
        {teams.map((t) => (
          <WcFlagChip key={t.code} code={t.code} name={t.name} className="h-5 w-[32px]" />
        ))}
      </div>
    </div>
  );
}

/** Vertical stack of group chips for one flank of the hero. When `height` is set
 *  the six chips distribute across it (justify-between) so the column spans the
 *  full bracket height and the top/bottom groups align with the bracket extremes. */
function GroupsColumn({ groups, height }: { groups: typeof WC_GROUPS; height?: number }) {
  return (
    <div
      className={height ? "flex flex-col justify-between" : "flex flex-col gap-2"}
      style={height ? { height } : undefined}
    >
      {groups.map((g) => (
        <GroupChip key={g.letter} {...g} />
      ))}
    </div>
  );
}

export function WorldCupHeroPortal() {
  const m = useSiteMessages();
  const hm = m.home;
  const wc = m.pages.worldCup;
  const reduce = useReducedMotion();

  const fade = (delay = 0) =>
    reduce
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: EASE },
        };

  const Logo = (
    <img
      src="/images/wc-2026-logo.png"
      alt="FIFA World Cup 2026"
      width={663}
      height={1024}
      className="h-full w-auto select-none drop-shadow-[0_20px_45px_rgba(0,0,0,0.6)]"
      draggable={false}
    />
  );

  const Cta = (
    <Link
      href="/world-cup"
      className="group inline-flex items-center gap-3 rounded-full bg-[#00f948] py-1.5 pl-6 pr-1.5 text-black shadow-[0_12px_34px_-12px_rgba(0,249,72,0.55)] ring-1 ring-inset ring-white/25 transition-[transform,filter] duration-150 hover:brightness-[1.04] active:scale-[0.98]"
    >
      <span className="font-wc-hero text-[15px] font-extrabold uppercase tracking-[0.04em]">
        {hm.wcPromoCta}
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[#00f948]">
        <svg
          className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-[2px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    </Link>
  );

  return (
    <section className="relative min-h-[min(100dvh,920px)] overflow-hidden bg-[#050608]">
      {/* Backdrop: stadium-night vignette + soft green core that the bracket converges into */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 30%, #0c0e12 0%, #08090c 55%, #050608 100%)",
          }}
        />
        {/* Trophy halo — pulls the eye to the centre where both pathways meet */}
        <div
          className="absolute left-1/2 top-1/2 h-[clamp(360px,52vh,620px)] w-[clamp(360px,52vh,620px)] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(0,249,72,0.14) 0%, rgba(0,249,72,0.05) 38%, transparent 68%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#050608] to-transparent sm:h-24" />
      </div>

      {/* Filmic grain */}
      <div
        className="pointer-events-none absolute inset-0 z-[8] opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "120px 120px",
        }}
        aria-hidden
      />

      <div className="relative z-20 mx-auto flex min-h-[min(100dvh,920px)] w-full max-w-[1440px] flex-col justify-center px-4 pb-16 pt-11 sm:px-6 sm:pb-14 lg:px-8">
        {/* ── Crown: live badge + official wordmark ── */}
        <motion.div {...fade(0.04)} className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00f948]/30 bg-[#00f948]/[0.08] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#00f948]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00f948]" />
            {hm.wcHeroLiveStatus}
          </span>
          <h1 className="flex flex-col items-center" aria-label={`FIFA World Cup 2026 — ${hm.wcPromoHosts}`}>
            <span
              aria-hidden
              className="mt-3 bg-clip-text font-wc-display text-[clamp(1.7rem,5.4vw,3.6rem)] uppercase leading-[0.92] tracking-[0.01em] text-transparent [filter:drop-shadow(0_4px_18px_rgba(0,0,0,0.55))]"
              style={{ backgroundImage: FOIL_FILL }}
            >
              FIFA World Cup 2026
            </span>
            <span
              aria-hidden
              className="mt-2 bg-clip-text font-wc-hero text-[clamp(0.7rem,1.5vw,0.95rem)] font-bold uppercase tracking-[0.34em] text-transparent"
              style={{ backgroundImage: GOLD_FILL }}
            >
              {hm.wcPromoHosts}
            </span>
          </h1>
        </motion.div>

        {/* ── Desktop: groups | bracket | logo (final) | bracket | groups ── */}
        <div className="mt-4 hidden items-center justify-center gap-3 lg:flex xl:gap-5">
          <motion.div {...fade(0.3)}>
            <GroupsColumn groups={LEFT_GROUPS} height={BRACKET_HEIGHT} />
          </motion.div>

          <motion.div {...fade(0.2)}>
            <WcHeroBracket root={BRACKET_LEFT} side="left" height={BRACKET_HEIGHT} />
          </motion.div>

          <motion.div {...fade(0.1)} className="flex shrink-0 flex-col items-center px-1">
            <span className="font-wc-hero text-[10px] font-bold uppercase tracking-[0.4em] text-[#00f948]/70 [text-shadow:0_0_12px_rgba(0,249,72,0.5)]">
              FINAL
            </span>
            <span className="mt-1 h-px w-20 bg-gradient-to-r from-transparent via-[#00f948]/45 to-transparent" aria-hidden />
            <div className="my-1.5 h-[clamp(230px,30vh,330px)]">{Logo}</div>
            <div className="mt-6">{Cta}</div>
          </motion.div>

          <motion.div {...fade(0.2)}>
            <WcHeroBracket root={BRACKET_RIGHT} side="right" height={BRACKET_HEIGHT} />
          </motion.div>

          <motion.div {...fade(0.3)}>
            <GroupsColumn groups={RIGHT_GROUPS} height={BRACKET_HEIGHT} />
          </motion.div>
        </div>

        {/* ── Mobile / tablet: logo, round rail, group strip ── */}
        <div className="mt-6 flex flex-col items-center lg:hidden">
          <motion.div {...fade(0.1)} className="flex flex-col items-center">
            <div className="h-[min(44vh,310px)]">{Logo}</div>
            <div className="mt-6">{Cta}</div>
          </motion.div>

          {/* Knockout path rail */}
          <motion.div {...fade(0.18)} className="mt-7 w-full">
            <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {["A–L", "R32", "R16", "QF", "SF", "F"].map((r, i, arr) => (
                <div key={r} className="flex items-center gap-1.5">
                  <span
                    className={
                      "flex h-7 shrink-0 items-center justify-center rounded-md border px-2.5 font-wc-hero text-[10px] font-bold uppercase tracking-wide " +
                      (i === arr.length - 1
                        ? "border-[#00f948]/40 bg-[#00f948]/10 text-[#00f948]"
                        : "border-white/12 bg-white/[0.04] text-white/60")
                    }
                  >
                    {r}
                  </span>
                  {i < arr.length - 1 && (
                    <svg className="h-3 w-3 shrink-0 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fade(0.24)} className="mt-5 w-full">
            <p className="mb-2 flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
              <span className="h-px w-5 bg-white/25" />
              {wc.stageGroup} · A–L
            </p>
            <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {WC_GROUPS.map((g) => (
                <div key={g.letter} className="shrink-0 snap-start">
                  <GroupChip {...g} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
