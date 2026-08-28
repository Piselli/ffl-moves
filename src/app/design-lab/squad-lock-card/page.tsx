"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ShareSquadOnXModal } from "@/components/ShareSquadOnXModal";
import { ShareCardHalfPitch } from "@/components/share/variants/ShareCardHalfPitch";
import { ShareCardHalfPitchClassic } from "@/components/share/variants/ShareCardHalfPitchClassic";
import {
  SQUAD_SHARE_CARD_HEIGHT,
  SQUAD_SHARE_CARD_WIDTH,
  SQUAD_SHARE_MARKET_VARIANTS,
} from "@/components/share/shareCardTypes";
import { LAB_LEADERBOARD } from "@/components/design-lab/locker-leaderboard/mockData";
import { catalogHitFromName } from "@/lib/fpl-photo-from-name";
import { slotPosition, type FormationId } from "@/lib/formation";
import type { Player } from "@/lib/types";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { LabSquadPlayer } from "@/components/design-lab/locker-leaderboard/mockData";

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

function ScaledShareCard({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      setScale(Math.min(1, el.clientWidth / SQUAD_SHARE_CARD_WIDTH));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ height: SQUAD_SHARE_CARD_HEIGHT * scale }}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: SQUAD_SHARE_CARD_WIDTH,
            height: SQUAD_SHARE_CARD_HEIGHT,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function SquadLockCardPreviewPage() {
  const ss = useSiteMessages().pages.squadShare;
  const g = useSiteMessages().pages.gameweek;
  const [catalog, setCatalog] = useState<Player[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

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

  const cardProps = {
    starters: starters ?? [],
    bench,
    tourLabel: `${g.gwWord} ${LAB_LEADERBOARD.gameweek}`,
    managerLabel: "Andriy",
    headline: ss.cardHeadline,
    lockedLabel: ss.cardLocked,
    siteUrl: "form8.app",
    formationId: FORMATION,
  };

  const variants = SQUAD_SHARE_MARKET_VARIANTS.map((v) => ({
    ...v,
    node: v.classic ? (
      <ShareCardHalfPitchClassic
        {...cardProps}
        pitchPlacement={v.pitchPlacement ?? "right"}
        listPanel={v.listPanel ?? "soft"}
        listRowStyle={v.listRowStyle ?? "glass"}
        chipMode={v.chipMode ?? "glass"}
        pitchFrameStyle={v.pitchFrameStyle ?? "none"}
        mutedPlateStyle={v.mutedPlateStyle ?? "site"}
        unifiedPanel={v.unifiedPanel ?? false}
      />
    ) : (
      <ShareCardHalfPitch
        {...cardProps}
        listStyle="kit"
        pitchSide={v.pitchSide!}
        pitchStyleId={v.pitchStyleId!}
      />
    ),
  }));

  return (
    <div className="min-h-screen bg-[#050506] pb-16 text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050506]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#00f948]/75">
              Form8 · Half pitch
            </p>
            <h1 className="mt-0.5 font-display text-lg font-black uppercase tracking-wide">
              Half-field share cards
            </h1>
            <p className="mt-1 max-w-xl text-[12px] text-white/40">
              Tablet black · classic variants · v13 white plates ships in modal.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/design-lab"
              className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 transition hover:border-white/20 hover:text-white/80"
            >
              ← Lab
            </Link>
            <button
              type="button"
              disabled={!starters?.length}
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-white px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-wider text-black transition hover:brightness-95 disabled:opacity-40"
            >
              Share modal (v13)
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        <nav className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
            Card variants
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {variants.map((v) => (
              <li key={v.id}>
                <a
                  href={`#${v.id}`}
                  className="inline-block rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/55 transition hover:border-white/20 hover:text-white/85"
                >
                  {v.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
            Share entry points (product)
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <li>
              <a
                href="/design-lab/share-modal"
                className="rounded-lg border border-[#00f948]/25 bg-[#00f948]/[0.06] px-2.5 py-1.5 font-semibold text-[#00f948]/90 hover:bg-[#00f948]/10"
              >
              Share modal preview (no registration)
              </a>
            </li>
            <li>
              <a
                href="/"
                className="rounded-lg border border-white/10 px-2.5 py-1.5 font-semibold text-white/55 hover:border-white/20 hover:text-white/85"
              >
                Homepage locker · Share when registered
              </a>
            </li>
          </ul>
        </nav>

        {!starters?.length ? (
          <p className="text-sm text-rose-300/90">
            Could not build mock XI from catalog. Check /api/players.
          </p>
        ) : (
          variants.map((v) => (
            <section key={v.id} id={v.id} className="scroll-mt-28 space-y-3">
              <div>
                <h2 className="font-display text-sm font-black uppercase tracking-wider text-white">
                  {v.label}
                </h2>
                <p className="mt-0.5 text-[12px] text-white/40">{v.tagline}</p>
              </div>
              <div className="overflow-hidden rounded-[20px] border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                <ScaledShareCard>{v.node}</ScaledShareCard>
              </div>
            </section>
          ))
        )}
      </main>

      {starters?.length ? (
        <ShareSquadOnXModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          starters={starters}
          bench={bench}
          context="gameweek"
          tourLabel={cardProps.tourLabel}
          formationId={FORMATION}
          managerLabelOverride="Andriy"
        />
      ) : null}
    </div>
  );
}
