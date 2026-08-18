"use client";

import Link from "next/link";
import { BlueprintDirection } from "@/components/design-lab/BlueprintDirection";
import { TabloidDirection } from "@/components/design-lab/TabloidDirection";
import { ScoreboardDirection } from "@/components/design-lab/ScoreboardDirection";
import { PassportDirection } from "@/components/design-lab/PassportDirection";
import { ContourDirection } from "@/components/design-lab/ContourDirection";
import { PosterDirection } from "@/components/design-lab/PosterDirection";

const ROUND2 = [
  { id: "A", name: "Blueprint", hook: "Squad = engineering schematic" },
  { id: "B", name: "Tabloid", hook: "Each GW = front page" },
  { id: "C", name: "LED Scoreboard", hook: "Stadium hardware, not app UI" },
  { id: "D", name: "Movement Passport", hook: "Onchain = visa stamp" },
  { id: "E", name: "Topographic Rank", hook: "Leaderboard = terrain map" },
  { id: "F", name: "Swiss Poster", hook: "Type IS the product" },
];

export default function DesignLabPage() {
  return (
    <div className="min-h-screen bg-[#050506] pb-24">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050506]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#00f948]/80">
              FORM8 · Design Lab · Round 2
            </p>
            <h1 className="mt-0.5 text-lg font-medium text-white">Unique Directions</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/design-lab/locker-hero/nameplates"
              className="rounded-sm border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-400/20"
            >
              Nameplates →
            </Link>
            <Link
              href="/design-lab/locker-hero/nameplates/styles"
              className="rounded-sm border border-emerald-400/35 bg-emerald-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-400/20"
            >
              NP styles →
            </Link>
            <Link
              href="/design-lab/locker-tablet"
              className="rounded-sm border border-violet-400/35 bg-violet-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-violet-300 transition-colors hover:bg-violet-400/20"
            >
              iPad styles →
            </Link>
            <Link
              href="/design-lab/locker-leaderboard"
              className="rounded-sm border border-sky-400/35 bg-sky-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-sky-300 transition-colors hover:bg-sky-400/20"
            >
              Lounge TV →
            </Link>
            <Link
              href="/design-lab/desk-results"
              className="rounded-sm border border-lime-400/35 bg-lime-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-lime-300 transition-colors hover:bg-lime-400/20"
            >
              Desk results →
            </Link>
            <Link
              href="/design-lab/locker-menu"
              className="rounded-sm border border-orange-400/35 bg-orange-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-orange-300 transition-colors hover:bg-orange-400/20"
            >
              Menu A/B →
            </Link>
            <Link
              href="/design-lab/form8-logo"
              className="rounded-sm border border-fuchsia-400/35 bg-fuchsia-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fuchsia-300 transition-colors hover:bg-fuchsia-400/20"
            >
              form8 logo →
            </Link>
            <Link
              href="/design-lab/locker-hero"
              className="rounded-sm border border-[#00f948]/35 bg-[#00f948]/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#00f948] transition-colors hover:bg-[#00f948]/20"
            >
              Locker Hero →
            </Link>
            <Link
              href="/"
              className="rounded-sm border border-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              ← Back to app
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-16 px-4 pt-10 sm:px-6 sm:pt-14">
        <section className="max-w-3xl">
          <p className="text-base leading-relaxed text-white/55">
            Шість напрямків з нуля. Не gallery, не terminal, не gamification, не crypto-purple. Кожен — власна
            метафора, яку топ-дизайнер обрав би навмисно. Клікай прототипи, читай animation spec під кожним.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROUND2.map((r) => (
              <div
                key={r.id}
                className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-3 py-2.5"
              >
                <span className="font-mono text-[10px] text-[#00f948]/70">{r.id}</span>
                <span className="ml-2 text-sm font-medium text-white/80">{r.name}</span>
                <p className="mt-0.5 text-xs text-white/40">{r.hook}</p>
              </div>
            ))}
          </div>
        </section>

        <BlueprintDirection />
        <TabloidDirection />
        <ScoreboardDirection />
        <PassportDirection />
        <ContourDirection />
        <PosterDirection />

        <footer className="border-t border-white/[0.06] pt-8 text-center text-xs text-white/30">
          Round 2 · /design-lab · prod untouched
        </footer>
      </div>
    </div>
  );
}
