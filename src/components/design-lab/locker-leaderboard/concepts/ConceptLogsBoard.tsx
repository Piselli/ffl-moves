"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp, SlidingTabs } from "./vibeKit";
import {
  ConceptChrome,
  GhostBtn,
  WhiteCta,
  XiStrip,
  scrollOwnerIntoView,
  useRtSurfaceStyle,
} from "./rtKit";

type BoardTab = "board" | "you" | "search";

/**
 * B · Expand Logs Board
 * Refero: Linear density + Authkit frost.
 * TripleD: Interactive Logs expand + Command Palette + Counter Up.
 */
export function ConceptLogsBoard() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [tab, setTab] = useState<BoardTab>("board");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [claimOpen, setClaimOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return s.data.rows;
    return s.data.rows.filter(
      (r) =>
        r.nickname.toLowerCase().includes(q) ||
        String(r.rank).includes(q) ||
        r.owner.toLowerCase().includes(q),
    );
  }, [query, s.data.rows]);

  const tierWash = useMemo(() => {
    const row = s.data.rows.find((r) => r.owner === expanded);
    if (!row) return "rgba(255,255,255,0.04)";
    if (row.rank <= 3) return "rgba(255,255,255,0.10)";
    if (row.rank <= 100) return "rgba(180,190,210,0.07)";
    return "rgba(120,100,90,0.08)";
  }, [expanded, s.data.rows]);

  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        setTab("search");
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#08090a] text-white"
      style={style}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        animate={{ background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${tierWash}, transparent 60%)` }}
        transition={{ duration: 0.6 }}
      />
      <ResultsPlaceNav />
      <ConceptChrome
        title="B · Expand Logs Board"
        hook="Dense Linear ladder. Expand a row → XI unfolds. ⌘K jumps."
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-28 pt-40 sm:px-6">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: "GW pts top", value: s.data.rows[0]?.finalPoints ?? 0 },
            { label: "Prize pool", value: s.data.prizePoolLabel },
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

        <SlidingTabs
          tabs={[
            { id: "board" as const, label: "Board" },
            { id: "you" as const, label: "You" },
            { id: "search" as const, label: "Search" },
          ]}
          value={tab}
          onChange={setTab}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <GhostBtn
            onClick={() => {
              setPaletteOpen(true);
              setTab("search");
            }}
          >
            ⌘K Find
          </GhostBtn>
          {canClaim ? (
            <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
          ) : null}
        </div>

        {(tab === "search" || paletteOpen) && (
          <div className="mt-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nickname / rank…"
              className="w-full rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
            />
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <p className="font-display text-sm font-black uppercase tracking-wide">
              Standings
            </p>
            <p className="text-[10px] text-white/35">
              {filtered.length} of {s.data.rows.length}
            </p>
          </div>

          <div className="max-h-[52vh] overflow-y-auto">
            {(tab === "you" && s.you ? [s.you] : filtered).map((row) => {
              const open = expanded === row.owner;
              const xi = row.xi ?? row.squad;
              return (
                <div
                  key={row.owner}
                  id={`rt-row-${row.owner}`}
                  className={cn(
                    "border-b border-white/[0.05]",
                    row.isYou && "bg-white/[0.03]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded((v) => (v === row.owner ? null : row.owner));
                      s.select(row.owner);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn(
                        "h-8 w-0.5 rounded-full",
                        row.isYou ? "bg-white" : "bg-transparent",
                      )}
                    />
                    <span className="w-8 font-display text-sm font-black tabular-nums text-white/40">
                      {row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-display text-sm font-black uppercase">
                      {row.nickname}
                    </span>
                    {row.claimed ? (
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/40">
                        Claimed
                      </span>
                    ) : row.prizeAmount > 0 ? (
                      <span className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/60">
                        Prize
                      </span>
                    ) : null}
                    <span className="font-display text-base font-black tabular-nums">
                      {open ? (
                        <CounterUp value={row.finalPoints} />
                      ) : (
                        row.finalPoints
                      )}
                    </span>
                    <motion.span
                      animate={{ rotate: open ? 90 : 0 }}
                      className="text-white/30"
                    >
                      ›
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/[0.05] bg-white/[0.02] px-4 py-4 pl-14">
                          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                            XI · GW {s.data.gameweek}
                          </p>
                          <XiStrip players={xi} />
                          {row.prizeAmount > 0 ? (
                            <p className="mt-3 text-[11px] text-white/45">
                              Share{" "}
                              <span className="tabular-nums text-white">
                                {row.prizeAmount}
                              </span>{" "}
                              {s.data.prizeSymbol}
                            </p>
                          ) : null}
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
        body="Confirm to claim your GW share."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
          if (s.you) {
            setExpanded(s.you.owner);
            scrollOwnerIntoView(s.you.owner);
          }
        }}
      />
    </div>
  );
}
