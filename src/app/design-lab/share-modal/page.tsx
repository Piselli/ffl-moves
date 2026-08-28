"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShareSquadOnXModal } from "@/components/ShareSquadOnXModal";
import { LAB_LEADERBOARD } from "@/components/design-lab/locker-leaderboard/mockData";
import type { LabSquadPlayer } from "@/components/design-lab/locker-leaderboard/mockData";
import { catalogHitFromName } from "@/lib/fpl-photo-from-name";
import { slotPosition, type FormationId } from "@/lib/formation";
import type { Player } from "@/lib/types";
import { useSiteMessages } from "@/i18n/LocaleProvider";

const FORMATION: FormationId = "4-3-3";
const MOCK_ROW =
  LAB_LEADERBOARD.rows.find((r) => r.bench && r.bench.length >= 3) ??
  LAB_LEADERBOARD.rows.find((r) => r.isYou) ??
  LAB_LEADERBOARD.rows[0]!;

function labPlayerToPlayer(
  lab: LabSquadPlayer,
  i: number,
  asStarter: boolean,
): Player {
  const hit = catalogHitFromName(lab.name, lab.teamId);
  const pos =
    lab.position ??
    (asStarter
      ? slotPosition(i, FORMATION)
      : lab.positionId === 0
        ? "GK"
        : lab.positionId === 1
          ? "DEF"
          : lab.positionId === 2
            ? "MID"
            : "FWD");
  const positionId =
    lab.positionId ??
    (pos === "GK" ? 0 : pos === "DEF" ? 1 : pos === "MID" ? 2 : 3);

  return {
    id: (asStarter ? 9000 : 9100) + i,
    name: lab.name,
    webName: lab.name,
    team: "—",
    teamId: lab.teamId ?? hit?.teamId ?? 0,
    position: pos,
    positionId,
    fplPhotoCode: lab.fplPhotoCode ?? hit?.code,
  };
}

function resolveFromCatalog(
  lab: LabSquadPlayer,
  base: Player,
  catalog: Player[],
): Player {
  const hit = catalogHitFromName(lab.name, lab.teamId);
  const fromCatalog =
    catalog.find(
      (p) =>
        p.fplPhotoCode === hit?.code ||
        p.webName?.toLowerCase() === lab.name.toLowerCase() ||
        p.name.toLowerCase().includes(lab.name.toLowerCase()),
    ) ?? null;
  if (!fromCatalog) return base;
  return {
    ...fromCatalog,
    positionId: base.positionId,
    position: base.position,
  };
}

function ShareModalLabInner() {
  const { pages } = useSiteMessages();
  const g = pages.gameweek;
  const [catalog, setCatalog] = useState<Player[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Player[];
        if (!cancelled) setCatalog(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const starters = useMemo(() => {
    const xi = MOCK_ROW.xi;
    if (!xi?.length || xi.length < 11) return null;
    return xi.slice(0, 11).map((lab, i) => {
      const base = labPlayerToPlayer(lab, i, true);
      return resolveFromCatalog(lab, base, catalog);
    });
  }, [catalog]);

  const bench = useMemo(() => {
    const rows = MOCK_ROW.bench ?? [];
    return rows.slice(0, 3).map((lab, i) => {
      const base = labPlayerToPlayer(lab, i, false);
      return resolveFromCatalog(lab, base, catalog);
    });
  }, [catalog]);

  return (
    <div className="min-h-screen bg-[#050506] text-white">
      <header className="border-b border-white/[0.06] bg-[#050506]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#00f948]/75">
              Form8 · Share modal
            </p>
            <h1 className="mt-0.5 font-display text-lg font-black uppercase tracking-wide">
              3D hero card
            </h1>
            <p className="mt-1 text-[12px] text-white/40">
              Tilt on hover · Download + Copy · no glass panel
            </p>
          </div>
          <Link
            href="/design-lab/share-modal-layouts"
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50"
          >
            ← Layouts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm text-white/45">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-semibold text-white/70 underline-offset-2 hover:underline"
          >
            Reopen modal
          </button>
        </p>
      </main>

      {starters?.length ? (
        <ShareSquadOnXModal
          open={open}
          onClose={() => setOpen(false)}
          starters={starters}
          bench={bench}
          context="gameweek"
          tourLabel={`${g.gwWord} ${LAB_LEADERBOARD.gameweek}`}
          formationId={FORMATION}
          managerLabelOverride="Andriy"
        />
      ) : (
        <p className="px-4 text-center text-sm text-rose-300/90">
          Loading mock squad…
        </p>
      )}
    </div>
  );
}

export default function ShareModalLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050506] text-white/40">
          Loading…
        </div>
      }
    >
      <ShareModalLabInner />
    </Suspense>
  );
}
