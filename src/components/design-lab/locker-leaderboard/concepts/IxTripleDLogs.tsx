"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp, SlidingTabs } from "./vibeKit";
import {
  GhostBtn,
  WhiteCta,
  XiStrip,
  scrollOwnerIntoView,
  useRtSurfaceStyle,
} from "./rtKit";

/**
 * Port of TripleD Interactive Logs Table grammar:
 * search + filter chips + expandable rows with spring detail panel.
 * Content = GW standings, not observability cosplay.
 */
export function IxTripleDLogs() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "prize" | "you">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  const filtered = useMemo(() => {
    let rows = s.data.rows;
    if (filter === "prize") rows = rows.filter((r) => r.prizeAmount > 0);
    if (filter === "you") rows = rows.filter((r) => r.isYou);
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nickname.toLowerCase().includes(q) ||
        String(r.rank).includes(q),
    );
  }, [filter, query, s.data.rows]);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#08090a] text-white"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]"
      />
      <ResultsPlaceNav />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-32 pt-28 sm:px-6">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
          TripleD logs · ported
        </p>
        <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight">
          Standings
        </h1>
        <p className="mt-1 text-[12px] text-white/45">
          Expandable rows + search — Interactive Logs pattern, FORM8 data.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: "Top pts", value: s.data.rows[0]?.finalPoints ?? 0 },
            { label: "Pool", value: s.data.prizePoolLabel },
            { label: "Field", value: s.data.entries },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                {m.label}
              </p>
              <p className="mt-1 font-display text-xl font-black tabular-nums">
                {typeof m.value === "number" ? (
                  <CounterUp value={m.value} />
                ) : (
                  m.value
                )}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <GhostBtn
            onClick={() => {
              if (!s.you) return;
              setFilter("you");
              setExpanded(s.you.owner);
              s.select(s.you.owner);
              scrollOwnerIntoView(s.you.owner);
            }}
          >
            Find me
          </GhostBtn>
          {canClaim ? (
            <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
          ) : null}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/50 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
            <p className="font-display text-sm font-black uppercase">Logs</p>
            <p className="text-[10px] text-white/35">
              {filtered.length} of {s.data.rows.length}
            </p>
          </div>

          <div className="flex gap-2 border-b border-white/[0.06] px-4 py-3">
            <div className="relative min-w-0 flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nickname or rank…"
                className="w-full rounded-xl border border-white/10 bg-black/60 py-2.5 pl-3 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
              />
            </div>
          </div>

          <div className="px-4 py-2">
            <SlidingTabs
              tabs={[
                { id: "all" as const, label: "All" },
                { id: "prize" as const, label: "Prize" },
                { id: "you" as const, label: "You" },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>

          <div className="max-h-[52vh] overflow-y-auto">
            {filtered.map((row) => {
              const open = expanded === row.owner;
              return (
                <div
                  key={row.owner}
                  id={`rt-row-${row.owner}`}
                  className="border-b border-white/[0.05] last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded((v) => (v === row.owner ? null : row.owner));
                      s.select(row.owner);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03]"
                  >
                    <motion.span
                      animate={{ rotate: open ? 90 : 0 }}
                      className="text-white/30"
                    >
                      ›
                    </motion.span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                        row.prizeAmount > 0
                          ? "border-white/30 text-white/80"
                          : row.isYou
                            ? "border-white/20 text-white/60"
                            : "border-white/10 text-white/35",
                      )}
                    >
                      {row.prizeAmount > 0
                        ? "prize"
                        : row.isYou
                          ? "you"
                          : "entry"}
                    </span>
                    <span className="w-8 font-display text-sm font-black tabular-nums text-white/40">
                      {row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-display text-sm font-black uppercase">
                      {row.nickname}
                    </span>
                    <span className="font-display text-base font-black tabular-nums">
                      {open ? (
                        <CounterUp value={row.finalPoints} />
                      ) : (
                        row.finalPoints
                      )}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 bg-white/[0.02] px-4 py-4 pl-14">
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/50 sm:grid-cols-3">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">
                                Points
                              </p>
                              <p className="tabular-nums text-white">
                                {row.finalPoints}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">
                                Share
                              </p>
                              <p className="tabular-nums text-white">
                                {row.prizeAmount} {s.data.prizeSymbol}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">
                                Delta
                              </p>
                              <p className="tabular-nums text-white">
                                {row.gwDelta == null || row.gwDelta === 0
                                  ? "—"
                                  : `${row.gwDelta > 0 ? "+" : ""}${row.gwDelta}`}
                              </p>
                            </div>
                          </div>
                          <p className="pt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                            XI
                          </p>
                          <XiStrip players={row.xi ?? row.squad} />
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ClaimDialog
        open={claimOpen}
        title="Claim prize"
        body="Confirm claim from the standings log."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
        }}
      />
    </div>
  );
}
