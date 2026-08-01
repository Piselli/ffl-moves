"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { LAB_LEADERBOARD, PRIZE_SPLIT, type LabLeaderboardRow } from "./mockData";
import { getBoardTheme, type BoardThemeId } from "./themes";

type Density = "comfortable" | "compact";

type Props = {
  theme?: BoardThemeId;
  density?: Density;
  className?: string;
};

function rankTone(rank: number) {
  if (rank === 1) return "text-[color:var(--lb-rank-1)]";
  if (rank === 2) return "text-[color:var(--lb-rank-2)]";
  if (rank === 3) return "text-[color:var(--lb-rank-3)]";
  return "text-[color:var(--lb-rank-n)]";
}

function StatusCell({ row }: { row: LabLeaderboardRow }) {
  if (row.prizeAmount <= 0) {
    return (
      <span className="tabular-nums text-[color:var(--lb-muted)] opacity-60">
        —
      </span>
    );
  }
  if (row.claimed) {
    return (
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--lb-accent)]">
        Claimed
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--lb-muted)]">
      Unclaimed
    </span>
  );
}

/**
 * Shared GW results board — theme via CSS variables.
 * Visual mock only; no wallet / claim wiring.
 */
export function LockerLeaderboardBoard({
  theme = "neon",
  density = "comfortable",
  className,
}: Props) {
  const data = LAB_LEADERBOARD;
  const you = data.rows.find((r) => r.isYou);
  const compact = density === "compact";
  const t = getBoardTheme(theme);

  return (
    <div
      className={cn("min-w-0 text-[color:var(--lb-ink)]", className)}
      style={t.vars as CSSProperties}
    >
      <header
        className={cn(
          "flex flex-wrap items-end justify-between gap-4",
          compact ? "mb-5" : "mb-8",
        )}
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--lb-accent)] opacity-80">
            Season 25/26 · Gameweek {data.gameweek}
          </p>
          <h1
            className={cn(
              "mt-1 font-display font-black uppercase tracking-tight text-[color:var(--lb-ink)]",
              compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl",
            )}
          >
            Leaderboard
          </h1>
        </div>

        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2 backdrop-blur-md"
          style={{
            borderColor: "var(--lb-panel-ring)",
            background: "var(--lb-panel)",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--lb-muted)]">
            GW
          </span>
          <span className="font-display text-sm font-black tabular-nums text-[color:var(--lb-ink)]">
            {data.gameweek}
          </span>
          <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--lb-accent)]">
            Resolved
          </span>
        </div>
      </header>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-5 gap-y-3 border-y",
          compact ? "mb-5 py-3" : "mb-7 py-4",
        )}
        style={{ borderColor: "var(--lb-hairline)" }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--lb-muted)]">
            Pool
          </span>
          <span className="font-display text-xl font-black tabular-nums text-[color:var(--lb-accent)] sm:text-2xl">
            {data.prizePoolLabel}
          </span>
          <span className="text-xs text-[color:var(--lb-muted)]">
            {data.prizeSymbol}
          </span>
        </div>
        <div
          className="hidden h-4 w-px sm:block"
          style={{ background: "var(--lb-hairline)" }}
        />
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--lb-muted)]">
            Entries
          </span>
          <span className="font-display text-xl font-black tabular-nums text-[color:var(--lb-ink)] sm:text-2xl">
            {data.entries}
          </span>
        </div>
        <div className="relative ml-auto group/dist">
          <span className="cursor-default text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--lb-muted)] underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80">
            Top 10 split
          </span>
          <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-40 group-hover/dist:block">
            <div
              className="rounded-lg border p-3 shadow-2xl backdrop-blur-md"
              style={{
                borderColor: "var(--lb-panel-ring)",
                background: "var(--lb-tooltip-bg)",
              }}
            >
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--lb-muted)]">
                Prize share
              </p>
              <div className="space-y-1">
                {PRIZE_SPLIT.map((p) => (
                  <div key={p.rank} className="flex justify-between gap-2">
                    <span className="text-[11px] text-[color:var(--lb-muted)]">
                      #{p.rank}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold tabular-nums",
                        p.rank <= 3
                          ? "text-[color:var(--lb-body)]"
                          : "text-[color:var(--lb-muted)]",
                      )}
                    >
                      {p.pct}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {you ? (
        <section
          className={cn(
            "rounded-xl border",
            compact ? "mb-5 px-4 py-3" : "mb-7 px-5 py-4",
          )}
          style={{
            borderColor: "var(--lb-accent-ring)",
            background: "var(--lb-accent-soft)",
          }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--lb-accent)]">
              Your result · GW {data.gameweek}
            </p>
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--lb-accent)]"
              style={{
                borderColor: "var(--lb-accent-ring)",
                background: "var(--lb-accent-soft)",
              }}
            >
              In prizes
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p
                className={cn(
                  "font-display font-black tabular-nums",
                  rankTone(you.rank),
                  compact ? "text-2xl" : "text-3xl",
                )}
              >
                #{you.rank}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[color:var(--lb-muted)]">
                Rank
              </p>
            </div>
            <div>
              <p
                className={cn(
                  "font-display font-black tabular-nums text-[color:var(--lb-ink)]",
                  compact ? "text-2xl" : "text-3xl",
                )}
              >
                {you.finalPoints}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[color:var(--lb-muted)]">
                Points
              </p>
            </div>
            <div>
              <p
                className={cn(
                  "font-display font-black tabular-nums text-[color:var(--lb-accent)]",
                  compact ? "text-2xl" : "text-3xl",
                )}
              >
                {you.prizeAmount}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[color:var(--lb-muted)]">
                {data.prizeSymbol}
              </p>
            </div>
            <div className="flex items-end sm:items-center">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.08em] transition hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "var(--lb-accent)",
                  color: "var(--lb-accent-on)",
                }}
              >
                Claim prize
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div
        className="overflow-x-auto rounded-xl border backdrop-blur-md"
        style={{
          borderColor: "var(--lb-panel-ring)",
          background: "var(--lb-panel)",
        }}
      >
        <table className="w-full min-w-[560px] border-separate border-spacing-0">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--lb-hairline)" }}>
              {(["Rank", "Manager", "Pts", "Prize", "Status"] as const).map(
                (label, i) => (
                  <th
                    key={label}
                    className={cn(
                      "px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--lb-muted)]",
                      compact ? "py-2.5" : "py-3.5",
                      i === 0 || i === 1 ? "text-left" : "text-right",
                    )}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                key={row.owner}
                className="transition-colors"
                style={{
                  borderBottom: "1px solid var(--lb-hairline)",
                  background: row.isYou
                    ? "var(--lb-row-you)"
                    : row.rank <= 3
                      ? "color-mix(in srgb, var(--lb-ink) 3%, transparent)"
                      : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!row.isYou) {
                    e.currentTarget.style.background = "var(--lb-row-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!row.isYou) {
                    e.currentTarget.style.background =
                      row.rank <= 3
                        ? "color-mix(in srgb, var(--lb-ink) 3%, transparent)"
                        : "transparent";
                  }
                }}
              >
                <td
                  className={cn(
                    "px-4 align-middle",
                    compact ? "py-2.5" : "py-3.5",
                  )}
                >
                  <span
                    className={cn(
                      "font-display font-black tabular-nums",
                      compact ? "text-base" : "text-lg",
                      rankTone(row.rank),
                    )}
                  >
                    {row.rank}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-4 align-middle",
                    compact ? "py-2.5" : "py-3.5",
                  )}
                >
                  <p
                    className={cn(
                      "truncate font-mono text-sm",
                      row.isYou
                        ? "font-semibold text-[color:var(--lb-accent)]"
                        : "text-[color:var(--lb-body)]",
                    )}
                  >
                    {row.nickname}
                  </p>
                  {row.isYou ? (
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--lb-accent)] opacity-70">
                      You
                    </p>
                  ) : null}
                </td>
                <td
                  className={cn(
                    "px-4 text-right align-middle",
                    compact ? "py-2.5" : "py-3.5",
                  )}
                >
                  <span
                    className={cn(
                      "font-display font-black tabular-nums text-[color:var(--lb-ink)]",
                      compact ? "text-base" : "text-lg",
                    )}
                  >
                    {row.finalPoints}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-4 text-right align-middle",
                    compact ? "py-2.5" : "py-3.5",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      row.prizeAmount > 0
                        ? "text-[color:var(--lb-accent)]"
                        : "text-[color:var(--lb-muted)] opacity-60",
                    )}
                  >
                    {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-4 text-right align-middle",
                    compact ? "py-2.5" : "py-3.5",
                  )}
                >
                  <StatusCell row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-center text-[11px] text-[color:var(--lb-muted)]">
        Visual mock · claim & squad expand land after Solana move
      </p>
    </div>
  );
}
