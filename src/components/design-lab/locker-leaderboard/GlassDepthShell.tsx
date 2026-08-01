"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LAB_LEADERBOARD } from "./mockData";

/**
 * D · Glass — 2026 spatial / liquid-glass product surface.
 * Layered translucent panels + grain. No room photo.
 */
export function GlassDepthShell() {
  const data = LAB_LEADERBOARD;
  const you = data.rows.find((r) => r.isYou);
  const top3 = data.rows.slice(0, 3);
  const rest = data.rows.slice(3);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0b0d12] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[10%] top-[-10%] h-[50vh] w-[50vh] rounded-full bg-[#3d6bff]/20 blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[5%] h-[45vh] w-[45vh] rounded-full bg-[#00f948]/12 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <header className="relative z-20">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={120} height={76} className="h-7 w-auto" />
            <span className="font-display text-sm font-black uppercase tracking-tighter">
              MOVE<span className="text-[#00f948]">MATCH</span>
            </span>
          </Link>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60 backdrop-blur-md">
            GW {data.gameweek} · Resolved
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-4 px-4 pb-44 pt-6 sm:px-6 sm:pb-48 sm:pt-10">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Leaderboard
            </p>
            <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Top of the week
            </h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {top3.map((row) => (
                <div
                  key={row.owner}
                  className={cn(
                    "rounded-2xl border border-white/12 bg-black/25 p-4 backdrop-blur-md",
                    row.rank === 1 && "sm:-translate-y-2 border-white/25 bg-white/[0.08]",
                  )}
                >
                  <p className="font-display text-3xl font-black tabular-nums text-white/90">
                    #{row.rank}
                  </p>
                  <p className="mt-2 truncate font-display text-sm font-black uppercase tracking-tight">
                    {row.nickname}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-white/55">
                    {row.finalPoints} pts · {row.prizeAmount || "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col justify-between rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-2xl sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Prize pool
              </p>
              <p className="mt-2 font-display text-4xl font-black tabular-nums text-[#00f948]">
                {data.prizePoolLabel}
              </p>
              <p className="mt-1 text-sm text-white/45">
                {data.prizeSymbol} · {data.entries} managers
              </p>
            </div>
            {you ? (
              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Your place
                </p>
                <p className="mt-1 font-display text-2xl font-black tabular-nums">
                  #{you.rank} · {you.finalPoints} pts
                </p>
                <button
                  type="button"
                  className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-[12px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-[#00f948] active:scale-[0.98]"
                >
                  Claim {you.prizeAmount} {data.prizeSymbol}
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <section className="overflow-hidden rounded-3xl border border-white/12 bg-white/[0.05] backdrop-blur-2xl">
          <div className="border-b border-white/10 px-5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Full table
            </p>
          </div>
          <ul>
            {rest.map((row) => (
              <li
                key={row.owner}
                className={cn(
                  "flex items-center gap-4 border-b border-white/[0.06] px-5 py-3.5 last:border-0",
                  row.isYou && "bg-[#00f948]/10",
                )}
              >
                <span className="w-8 font-display text-lg font-black tabular-nums text-white/50">
                  {row.rank}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-display text-sm font-bold uppercase tracking-tight",
                    row.isYou ? "text-[#00f948]" : "text-white/85",
                  )}
                >
                  {row.nickname}
                </span>
                <span className="font-display text-base font-black tabular-nums">
                  {row.finalPoints}
                </span>
                <span className="w-14 text-right text-sm tabular-nums text-white/45">
                  {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
