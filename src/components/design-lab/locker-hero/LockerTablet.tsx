"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Player } from "@/lib/types";
import { FplPhotoAvatar } from "@/components/FplPhotoAvatar";
import type { PrizeAssetContextValue } from "@/components/PrizeAssetProvider";
import type { SiteMessages } from "@/i18n/messages";
import type { SiteLocale } from "@/i18n/types";
import { DEFAULT_PRIZE_TIERS } from "@/lib/prize-distribution";
import { cn } from "@/lib/utils";
import type {
  LockerFixture,
  LockerFixturesPayload,
} from "./useLockerHeroData";
import {
  getLockerPalette,
  paletteToCssVars,
} from "./lockerPalettes";
import { GlassPanel } from "./GlassPanel";
import {
  getPitchStyle,
  PITCH_STYLES,
  type PitchStyleId,
} from "./pitchStyles";
import { fitPitchName } from "./pitchChipName";
import { getPitchChipFont } from "./pitchChipFonts";
import { getCtaStyle } from "./ctaStyles";
import { getTypeface, typefaceToCssVars } from "./lockerTypefaces";
import { pl2627HomeKit } from "./pl2627HomeKits";
import { clubKitFor } from "./clubKitColors";
import { pitchCutoutPhotoCandidates } from "@/lib/playerPhoto";

type PositionFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";

const DISPLAY: CSSProperties = {
  fontFamily: "var(--lt-font-display)",
  letterSpacing: "var(--lt-display-tracking)",
};

type Props = {
  fixtures: LockerFixturesPayload | null;
  prizePoolRaw: bigint | null;
  entries: number | null;
  prize: PrizeAssetContextValue;
  locale: SiteLocale;
  messages: SiteMessages;
  players: Player[];
  playersLoading: boolean;
  starters: (Player | null)[];
  bench: (Player | null)[];
  activeSlot: number | null;
  selectedIds: Set<number>;
  filledCount: number;
  onSlotClick: (index: number) => void;
  onClearSlot: (index: number) => void;
  onPick: (player: Player) => void;
  onReset: () => void;
  onRandom: () => void;
  pitchStyleId?: PitchStyleId;
  onPitchStyleChange?: (id: PitchStyleId) => void;
};

function slotPos(i: number): Player["position"] {
  if (i === 0) return "GK";
  if (i <= 4) return "DEF";
  if (i <= 7) return "MID";
  return "FWD";
}

function useDeadlineParts(target: string | null) {
  const [parts, setParts] = useState<{
    h: number;
    m: number;
    expired: boolean;
  } | null>(null);
  useEffect(() => {
    if (!target) {
      setParts(null);
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ h: 0, m: 0, expired: true });
        return;
      }
      setParts({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return parts;
}

function dayKey(iso: string | null): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "tbc";
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatMatchDay(iso: string | null, locale: SiteLocale): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "TBC";
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function formatKickoffTime(iso: string | null, locale: SiteLocale): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "TBC";
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type MatchDayGroup = {
  key: string;
  label: string;
  matches: LockerFixture[];
};

function groupMatchesByDay(
  matches: LockerFixture[],
  locale: SiteLocale,
): MatchDayGroup[] {
  const groups: MatchDayGroup[] = [];
  const index = new Map<string, MatchDayGroup>();
  for (const match of matches) {
    const key = dayKey(match.kickoffTime);
    let group = index.get(key);
    if (!group) {
      group = {
        key,
        label: formatMatchDay(match.kickoffTime, locale),
        matches: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    group.matches.push(match);
  }
  return groups;
}

function clubShort(player: Player): string {
  const kit = pl2627HomeKit(player.teamId);
  if (kit?.short) return kit.short;
  const t = player.team.trim();
  return t.length <= 3 ? t.toUpperCase() : t.slice(0, 3).toUpperCase();
}

/** Club footer — primary kit colour (secondary only for near-white homes). */
function clubFooterColors(teamId: number): { bg: string; fg: string } {
  const colors = clubKitFor(teamId);
  const primary = colors.primary;
  const n = primary.replace("#", "");
  const lum = (() => {
    if (n.length !== 6) return 0.4;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  })();
  if (lum > 0.72) {
    const sec = colors.secondary;
    const sn = sec.replace("#", "");
    const sl =
      sn.length === 6
        ? (0.299 * parseInt(sn.slice(0, 2), 16) +
            0.587 * parseInt(sn.slice(2, 4), 16) +
            0.114 * parseInt(sn.slice(4, 6), 16)) /
          255
        : 0.2;
    return { bg: sec, fg: sl > 0.55 ? "#111111" : "#FFFFFF" };
  }
  return { bg: primary, fg: "#FFFFFF" };
}

/** Full surname, one size for every chip — never scale or abbreviate. */
function PitchFitName({
  raw,
  widthPx,
  fontSize = 10.5,
  className,
  style,
}: {
  raw: string;
  widthPx: number;
  fontSize?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const font = getPitchChipFont();
  const { label } = fitPitchName(raw, {
    widthPx,
    fontFamily: font.family,
    weight: font.weight,
    letterSpacing: font.tracking,
    fixedSize: fontSize,
    allowAbbreviate: false,
  });

  return (
    <span
      className={cn("block text-center", className)}
      style={{
        width: widthPx,
        maxWidth: widthPx,
        fontSize,
        lineHeight: 1.2,
        fontFamily: font.family,
        fontWeight: font.weight,
        letterSpacing: font.tracking,
        overflow: "visible",
        whiteSpace: "nowrap",
        display: "block",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
        ...style,
      }}
      title={raw}
    >
      {label}
    </span>
  );
}

/**
 * Plate width locked to the longest full surname we keep unabbreviated.
 * Calibrated to "Calvert-Lewin" @ IBM Plex Sans 600 / 10.5px / -0.01em.
 */
const PLATE_FONT_SIZE = 10.5;
const PLATE_TEXT_W = 70;
const PLATE_CHIP_W = 76; // text + 3px pad each side

/** Freestanding bust — normalized head/shoulders crop for mixed PL assets. */
function ChipCutout({
  player,
  name,
  size = 48,
}: {
  player: Player;
  name: string;
  size?: number;
}) {
  const candidates = useMemo(
    () => pitchCutoutPhotoCandidates(player),
    [player.photo, player.imageUrl, player.fplPhotoCode, player.apiId],
  );
  const [urlIndex, setUrlIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrlIndex(0);
    setFailed(false);
  }, [candidates.join("|")]);

  const src = !failed ? candidates[urlIndex] ?? null : null;
  const frameH = Math.round(size * 1.05);

  return (
    <span
      className="relative block shrink-0 overflow-hidden"
      style={{
        width: size,
        height: frameH,
        filter:
          "drop-shadow(0 2px 3px rgba(0,0,0,0.5)) drop-shadow(0 0 0.5px rgba(255,255,255,0.2))",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          onError={() => {
            if (urlIndex + 1 < candidates.length) {
              setUrlIndex((i) => i + 1);
            } else {
              setFailed(true);
            }
          }}
          className="pointer-events-none absolute left-1/2 max-w-none -translate-x-1/2 object-cover object-[center_8%]"
          style={{
            // Crop lower torso so wide/far PL shots (Virgil) match chest-up busts
            top: "-4%",
            width: "118%",
            height: "132%",
            background: "transparent",
          }}
        />
      ) : (
        <svg
          viewBox="0 0 64 80"
          width={size}
          height={frameH}
          className="text-white/55"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M32 15c7.2 0 13 5.6 13 12.5 0 5.2-3.1 9.7-7.6 11.7 9.2 2.2 15.6 10.4 15.6 20.2V68H10v-8.6c0-9.8 6.4-18 15.6-20.2C21.1 37.2 18 32.7 18 27.5 18 20.6 23.8 15 32 15z"
          />
        </svg>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}

function PitchPlayerChip({
  player,
  compact = false,
}: {
  player: Player;
  /** Smaller cutout + plate so 3 bench chips fit the substitutes panel */
  compact?: boolean;
}) {
  const name = player.webName ?? player.name;
  const club = clubShort(player);
  const typeface = getTypeface();
  const footer = clubFooterColors(player.teamId);
  const plateW = compact ? 46 : PLATE_CHIP_W;
  const textW = compact ? 40 : PLATE_TEXT_W;
  const fontSize = compact ? 8.5 : PLATE_FONT_SIZE;
  const cutoutSize = compact ? 30 : 48;

  return (
    <span className="flex flex-col items-center gap-0.5">
      <ChipCutout player={player} name={name} size={cutoutSize} />
      <span
        className="flex flex-col overflow-hidden rounded-[3px]"
        style={{
          width: plateW,
          background: footer.bg,
          boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}
      >
        <span
          className={cn(
            "flex items-center justify-center bg-white px-[3px]",
            compact ? "h-[15px]" : "h-[18px]",
          )}
          style={{ marginBottom: -1 }}
        >
          <PitchFitName
            raw={name}
            widthPx={textW}
            fontSize={fontSize}
            style={{ color: "#0a0a0a" }}
          />
        </span>
        <span
          className={cn(
            "relative z-[1] flex items-center justify-center px-[3px] text-center font-bold uppercase",
            compact ? "h-[10px] text-[7px]" : "h-[12px] text-[8px]",
          )}
          style={{
            background: footer.bg,
            color: footer.fg,
            fontFamily: typeface.ui,
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
        >
          {club}
        </span>
      </span>
    </span>
  );
}

function PitchEmptyChip({
  pos,
  active,
  compact = false,
}: {
  pos: Player["position"];
  active: boolean;
  compact?: boolean;
}) {
  const ring = active
    ? "ring-2 ring-white/70 ring-offset-1 ring-offset-transparent"
    : "";
  const typeface = getTypeface();
  const plateW = compact ? 46 : PLATE_CHIP_W;
  const head = compact ? 32 : 48;

  return (
    <span
      className="flex flex-col items-center gap-0.5"
      style={{ width: plateW }}
    >
      <span
        className={cn("flex items-center justify-center", ring)}
        style={{ width: head, height: Math.round(head * 1.05) }}
      >
        <span className="text-[22px] font-light text-white/55">+</span>
      </span>
      <span
        className="overflow-hidden rounded-[2px]"
        style={{ width: plateW }}
      >
        <span
          className="flex h-[15px] items-center justify-center bg-white px-0.5 text-center text-[9px] font-semibold text-black/65"
          style={{ fontFamily: typeface.ui, letterSpacing: "-0.01em" }}
        >
          {pos}
        </span>
        <span className="flex h-[11px] items-center justify-center bg-black/45 px-0.5 text-center text-[7px] font-semibold uppercase tracking-[0.06em] text-white/70">
          Pick
        </span>
      </span>
    </span>
  );
}

/** drei Html eats wheel — capture on tablet root and scroll the list under the cursor. */
function useLocalWheelScroll() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const port = t.closest("[data-lt-scroll]");
      if (!(port instanceof HTMLElement) || !root.contains(port)) return;
      if (port.clientHeight < 8) return;
      if (port.scrollHeight <= port.clientHeight + 1) return;
      e.stopPropagation();
      port.scrollTop += e.deltaY;
      e.preventDefault();
    };
    root.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => root.removeEventListener("wheel", onWheel, true);
  }, []);
  return rootRef;
}

function MatchRow({
  match,
  locale,
}: {
  match: LockerFixture;
  locale: SiteLocale;
}) {
  const badge =
    "aspect-square h-[78%] max-h-[30px] min-h-[16px] shrink-0 object-contain";
  return (
    <div className="flex min-h-0 items-center gap-2 overflow-hidden px-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={match.teamH.badge}
          alt=""
          className={badge}
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />
        <span className="truncate text-[13px] font-extrabold leading-none text-[color:var(--lt-ink)]">
          {match.teamH.shortName}
        </span>
      </div>
      <span className="shrink-0 text-[12px] font-bold tabular-nums tracking-tight text-[color:var(--lt-ink)]">
        {formatKickoffTime(match.kickoffTime, locale)}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="truncate text-right text-[13px] font-extrabold leading-none text-[color:var(--lt-ink)]">
          {match.teamA.shortName}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={match.teamA.badge}
          alt=""
          className={badge}
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />
      </div>
    </div>
  );
}

export function LockerTablet({
  fixtures,
  prizePoolRaw,
  entries,
  prize,
  locale,
  messages: m,
  players,
  playersLoading,
  starters,
  bench,
  activeSlot,
  selectedIds,
  filledCount,
  onSlotClick,
  onClearSlot,
  onPick,
  onReset,
  onRandom,
  pitchStyleId = "night-turf",
  onPitchStyleChange,
}: Props) {
  const palette = getLockerPalette();
  const pitch = getPitchStyle(pitchStyleId);
  const typeface = getTypeface();
  const cta = getCtaStyle();
  const useMaterialShell =
    palette.mode === "dark" || palette.material === "glass";
  /** Locked panel material — frosted glass. */
  const isGlass = useMaterialShell;
  const PANEL = cn(
    "rounded-2xl bg-[var(--lt-panel)] ring-1 ring-[var(--lt-panel-ring)] shadow-[var(--lt-panel-shadow)]",
  );
  const Panel = useMaterialShell ? GlassPanel : "div";
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState<PositionFilter>("ALL");
  const [teamFilter, setTeamFilter] = useState("");
  const [clock, setClock] = useState("");
  const tabletRootRef = useLocalWheelScroll();

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Date().toLocaleTimeString(locale === "uk" ? "uk-UA" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    updateClock();
    const id = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(id);
  }, [locale]);

  const deadline = fixtures?.gameweek?.deadlineTime ?? null;
  const gwId = fixtures?.gameweek?.id;
  const dayGroups = useMemo(
    () => groupMatchesByDay((fixtures?.fixtures ?? []).slice(0, 10), locale),
    [fixtures?.fixtures, locale],
  );
  const shownMatchCount = dayGroups.reduce((n, g) => n + g.matches.length, 0);
  const deadlineParts = useDeadlineParts(deadline);

  const firstPct = DEFAULT_PRIZE_TIERS[0]?.pct ?? 30;
  const firstRaw =
    prizePoolRaw != null
      ? (prizePoolRaw * BigInt(firstPct)) / 100n
      : null;

  const uniqueTeams = useMemo(() => {
    const names = new Set<string>();
    for (const p of players) {
      if (p.team) names.add(p.team);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [players]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const POSITION_ORDER: Record<Player["position"], number> = {
      GK: 0,
      DEF: 1,
      MID: 2,
      FWD: 3,
    };
    return players
      .filter((p) => (posFilter === "ALL" ? true : p.position === posFilter))
      .filter((p) => (teamFilter ? p.team === teamFilter : true))
      .filter((p) => {
        if (!q) return true;
        const name = (p.webName ?? p.name).toLowerCase();
        return name.includes(q) || p.team.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const teamCmp = a.team.localeCompare(b.team);
        if (teamCmp !== 0) return teamCmp;
        return (POSITION_ORDER[a.position] ?? 4) - (POSITION_ORDER[b.position] ?? 4);
      });
  }, [players, posFilter, teamFilter, query]);

  const rows: number[][] = [
    [8, 9, 10],
    [5, 6, 7],
    [1, 2, 3, 4],
    [0],
  ];

  return (
    <div
      ref={tabletRootRef}
      className="relative flex h-full w-full flex-col overflow-hidden pb-2.5"
      style={
        {
          color: "var(--lt-ink)",
          background: "var(--lt-canvas)",
          fontFamily: "var(--lt-font-ui)",
          WebkitFontSmoothing: "subpixel-antialiased",
          textRendering: "geometricPrecision",
          ...paletteToCssVars(palette),
          ...typefaceToCssVars(typeface),
        } as CSSProperties
      }
    >
      <div className="relative flex h-7 shrink-0 items-center justify-between px-5 text-[10px] font-semibold tabular-nums text-[color:var(--lt-ink)]">
        <span>{clock}</span>
        <span className="tracking-[0.08em]">Wi-Fi&nbsp;&nbsp;100%</span>
      </div>

      <header
        className={cn(
          "relative flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--lt-hairline)] px-5",
          isGlass && "border-white/60 bg-black",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[11px] text-[18px] font-black",
              isGlass
                ? "bg-white text-black"
                : undefined,
            )}
            style={
              isGlass
                ? { ...DISPLAY }
                : {
                    ...DISPLAY,
                    background: "var(--lt-accent)",
                    color: "var(--lt-accent-on)",
                  }
            }
          >
            M
          </div>
          <div>
            <p
              className="text-[17px] font-black leading-none text-[color:var(--lt-ink)]"
              style={DISPLAY}
            >
              Pick your team
            </p>
            <p className="mt-1 text-[10px] font-semibold text-[color:var(--lt-muted)]">
              MoveMatch Fantasy EPL
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--lt-muted)]">
            Selected
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[color:var(--lt-ink)]">
            {filledCount} of 11
          </p>
        </div>
      </header>

      <main className="relative grid min-h-0 flex-1 grid-cols-[minmax(230px,0.92fr)_minmax(0,1.28fr)_minmax(280px,0.98fr)] grid-rows-[minmax(0,1fr)_auto] gap-2.5 p-3 pt-2.5">
        <Panel
          {...(useMaterialShell ? { as: "section" as const } : {})}
          className={cn(
            !useMaterialShell && PANEL,
            "flex min-h-0 flex-col p-3",
          )}
        >
          <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2 px-1">
            <p
              className="text-[15px] font-black leading-none tracking-tight text-[color:var(--lt-ink)]"
              style={DISPLAY}
            >
              <span className="mr-1.5 font-extrabold uppercase text-[color:var(--lt-muted)]">
                Gameweek
              </span>
              {gwId == null ? "—" : gwId}
            </p>
            <p className="text-[10px] font-bold tabular-nums text-[color:var(--lt-muted)]">
              {shownMatchCount} matches
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-0.5">
            {dayGroups.length === 0 ? (
              <p className="px-1 py-3 text-[12px] text-[color:var(--lt-muted)]">
                Loading fixtures…
              </p>
            ) : (
              dayGroups.map((group) => (
                <div
                  key={group.key}
                  className="flex min-h-0 flex-1 flex-col"
                  style={{ flexGrow: group.matches.length }}
                >
                  <div className="flex shrink-0 items-center gap-2 px-1 pb-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--lt-ink)]">
                      {group.label}
                    </p>
                    <div className="h-px flex-1 bg-[color:var(--lt-ink)]/25" />
                  </div>
                  <div
                    className="min-h-0 flex-1 gap-y-2.5 overflow-hidden"
                    style={{
                      display: "grid",
                      gridTemplateRows: `repeat(${group.matches.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {group.matches.map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        locale={locale}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Pitch — flat top-down, style switchable */}
        <section
          className={cn(
            "relative min-h-0 overflow-hidden rounded-2xl ring-1",
            pitch.ring,
          )}
          style={{
            background: pitch.base,
            boxShadow: pitch.shadow,
          }}
        >
          {pitch.image && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 scale-[1.02]"
              style={{
                backgroundImage: `url(${pitch.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: pitch.imageFilter,
              }}
            />
          )}
          {pitch.stripes && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: pitch.stripes,
                opacity: pitch.stripesOpacity ?? 1,
              }}
            />
          )}
          {(pitch.overlays ?? []).map((bg, i) => (
            <div
              key={i}
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: bg }}
            />
          ))}

          {/* Bottom-right pitch corner — outside chalk, on the plate edge */}
          <div
            className="absolute bottom-1.5 right-1.5 z-20 flex items-center gap-1 rounded-full bg-black/40 p-1 ring-1 ring-white/15 backdrop-blur-sm"
            role="group"
            aria-label="Pitch look"
          >
            {PITCH_STYLES.map((p) => {
              const active = p.id === pitchStyleId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPitchStyleChange?.(p.id)}
                  aria-pressed={active}
                  aria-label={p.name}
                  title={p.name}
                  className={cn(
                    "h-3 w-3 rounded-full transition",
                    active
                      ? "ring-2 ring-white ring-offset-1 ring-offset-black/50"
                      : "opacity-55 hover:opacity-90",
                  )}
                  style={{
                    background: p.image
                      ? `center / cover url(${p.image}), ${p.swatch}`
                      : p.swatch,
                  }}
                />
              );
            })}
          </div>

          {/* chalk markings — orthographic; center circle ~FIFA ratio vs pitch width */}
          <div
            className="pointer-events-none absolute inset-[5%] rounded-[2px] border-2"
            style={{ borderColor: pitch.chalk }}
          >
            <div
              className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2"
              style={{ background: pitch.chalk }}
            />
            <div
              className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{ borderColor: pitch.chalk }}
            />
            {/* penalty / goal boxes */}
            <div
              className="absolute left-1/2 top-0 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-b-2"
              style={{ borderColor: pitch.chalk }}
            />
            <div
              className="absolute bottom-0 left-1/2 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-t-2"
              style={{ borderColor: pitch.chalk }}
            />
            {pitch.fullMarkings && (
              <>
                <div
                  className="absolute left-1/2 top-0 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-b-2"
                  style={{ borderColor: pitch.chalk }}
                />
                <div
                  className="absolute bottom-0 left-1/2 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-t-2"
                  style={{ borderColor: pitch.chalk }}
                />
                <div
                  className="absolute left-1/2 top-[14%] h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                  style={{ background: pitch.chalk }}
                />
                <div
                  className="absolute bottom-[14%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                  style={{ background: pitch.chalk }}
                />
                <div
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: pitch.chalk }}
                />
                {/* corner arcs (approx) */}
                <div
                  className="absolute left-0 top-0 h-3 w-3 rounded-br-full border-b-2 border-r-2"
                  style={{ borderColor: pitch.chalk }}
                />
                <div
                  className="absolute right-0 top-0 h-3 w-3 rounded-bl-full border-b-2 border-l-2"
                  style={{ borderColor: pitch.chalk }}
                />
                <div
                  className="absolute bottom-0 left-0 h-3 w-3 rounded-tr-full border-r-2 border-t-2"
                  style={{ borderColor: pitch.chalk }}
                />
                <div
                  className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-full border-l-2 border-t-2"
                  style={{ borderColor: pitch.chalk }}
                />
              </>
            )}
          </div>

          <div className="relative z-10 flex h-full flex-col justify-evenly px-0.5 py-1">
            {rows.map((row) => (
              <div key={row.join("-")} className="flex justify-evenly">
                {row.map((idx) => {
                  const p = starters[idx];
                  const pos = slotPos(idx);
                  const active = activeSlot === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => (p ? onClearSlot(idx) : onSlotClick(idx))}
                      className={cn(
                        "flex h-[108px] w-[82px] flex-col items-center justify-center rounded-xl bg-transparent transition-[transform,opacity,filter] duration-150 hover:brightness-110 active:scale-[0.96]",
                        active && !p && "opacity-100",
                        active && p && "brightness-110",
                      )}
                      style={
                        active && p
                          ? {
                              filter:
                                "drop-shadow(0 0 6px rgba(255,255,255,0.35))",
                            }
                          : undefined
                      }
                      aria-label={p ? p.webName ?? p.name : `Empty ${pos}`}
                    >
                      {p ? (
                        <PitchPlayerChip player={p} />
                      ) : (
                        <PitchEmptyChip pos={pos} active={active} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <Panel
          {...(useMaterialShell ? { as: "section" as const } : {})}
          className={cn(
            !useMaterialShell && PANEL,
            "flex min-h-0 flex-col overflow-hidden p-3",
          )}
        >
          <div className="shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-[14px] font-bold text-[color:var(--lt-ink)]">
                  Players
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[color:var(--lt-muted)]">
                  Choose for active position
                </p>
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-[color:var(--lt-muted)]">
                {filtered.length} found
              </span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players"
              className="w-full rounded-xl border border-[color:var(--lt-ink)]/20 bg-[var(--lt-input-bg)] px-3 py-2.5 text-[13px] text-[color:var(--lt-ink)] outline-none transition-colors placeholder:text-[color:var(--lt-muted)] focus:border-[color:var(--lt-ink)]/40"
            />
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="mt-2 w-full appearance-none rounded-xl border border-[color:var(--lt-ink)]/20 bg-[var(--lt-input-bg)] px-3 py-2.5 text-[13px] font-semibold text-[color:var(--lt-ink)] outline-none transition-colors focus:border-[color:var(--lt-ink)]/40"
            >
              <option value="">All clubs</option>
              {uniqueTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <div className="mt-2 flex gap-1 rounded-xl bg-[var(--lt-chip-track)] p-1">
              {(["ALL", "GK", "DEF", "MID", "FWD"] as PositionFilter[]).map(
                (pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosFilter(pos)}
                    className={cn(
                      "flex-1 rounded-lg px-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                      posFilter === pos
                        ? "bg-[var(--lt-chip-active)] text-[color:var(--lt-chip-active-text)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                        : "text-[color:var(--lt-faint)] hover:text-[color:var(--lt-ink)]",
                    )}
                  >
                    {pos}
                  </button>
                ),
              )}
            </div>
          </div>

          <div
            data-lt-scroll
            className="no-scrollbar mt-1.5 min-h-0 flex-1 divide-y divide-[color:var(--lt-ink)]/15 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            {playersLoading ? (
              <p className="px-2 py-4 text-[13px] text-[color:var(--lt-muted)]">
                Loading players...
              </p>
            ) : (
              filtered.map((p) => {
                const taken = selectedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={taken}
                    onClick={() => onPick(p)}
                    className={cn(
                      "flex w-full items-center gap-3 px-1.5 py-2 text-left transition-[transform,background-color,opacity] duration-150",
                      taken
                        ? "cursor-default opacity-40"
                        : "hover:bg-[color:var(--lt-ink)]/[0.06] active:scale-[0.99]",
                    )}
                  >
                    <FplPhotoAvatar
                      fplPhotoCode={p.fplPhotoCode}
                      apiId={p.apiId}
                      photoUrl={p.photo}
                      alt={p.webName ?? p.name}
                      size={54}
                      teamName={p.team}
                      initials={p.webName ?? p.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-[color:var(--lt-ink)]">
                        {p.webName ?? p.name}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--lt-muted)]">
                        {p.position} · {p.team}
                      </p>
                    </div>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[16px] font-bold"
                      style={
                        isGlass
                          ? {
                              background: "#FFFFFF",
                              color: "#000000",
                            }
                          : {
                              background: "var(--lt-accent-soft)",
                              color: "var(--lt-accent)",
                            }
                      }
                    >
                      +
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          className={cn(!useMaterialShell && PANEL, "px-3.5 py-2.5")}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--lt-muted)]">
            Prize pool
          </p>
          <p
            className="mt-1 text-[20px] font-black leading-none tabular-nums text-[color:var(--lt-ink)]"
            style={DISPLAY}
          >
            {prizePoolRaw == null
              ? "—"
              : prize.formatHero(prizePoolRaw, locale === "uk" ? "uk" : "en")}
          </p>
          <p className="mt-1.5 text-[11px] font-semibold leading-snug text-[color:var(--lt-soft)]">
            1st {firstRaw == null ? "—" : prize.formatCompact(firstRaw)}
            <span className="mx-1.5 text-[color:var(--lt-ink)]/50">·</span>
            {entries == null ? "—" : entries} managers
          </p>
        </Panel>

        <div className="grid grid-cols-2 gap-2.5">
          <Panel
            className={cn(!useMaterialShell && PANEL, "px-3.5 py-2.5")}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--lt-muted)]">
              Deadline
            </p>
            <p
              className={cn(
                "mt-1 text-[19px] font-black leading-none tabular-nums",
                isGlass && "text-white",
              )}
              style={
                isGlass ? DISPLAY : { ...DISPLAY, color: "var(--lt-accent)" }
              }
            >
              {!deadline
                ? "—"
                : !deadlineParts
                  ? "..."
                  : deadlineParts.expired
                    ? m.home.deadlinePassed
                    : `${String(deadlineParts.h).padStart(2, "0")}h ${String(deadlineParts.m).padStart(2, "0")}m`}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--lt-soft)]">
              until lock
            </p>
          </Panel>

          <Panel
            className={cn(!useMaterialShell && PANEL, "px-3.5 py-2.5")}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--lt-muted)]">
              3 substitutes
            </p>
            <div className="mt-1.5 flex min-w-0 items-end justify-evenly gap-1.5">
              {bench.slice(0, 3).map((p, i) => (
                <div key={i} className="flex min-w-0 flex-1 justify-center">
                  {p ? (
                    <PitchPlayerChip player={p} compact />
                  ) : (
                    <PitchEmptyChip pos="MID" active={false} compact />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex h-full min-h-0 items-stretch gap-2">
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset"
              title="Reset"
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl transition active:scale-[0.96]",
                isGlass
                  ? "bg-black/55 text-white ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md hover:bg-black/70 hover:ring-white/40"
                  : "border-2 border-[var(--lt-reset-border)] bg-[var(--lt-reset-bg)] text-[color:var(--lt-reset-text)] hover:brightness-95",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-2.6-6.3" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRandom}
              aria-label="Random squad"
              title="Random squad"
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl transition active:scale-[0.96]",
                isGlass
                  ? "bg-black/55 text-white ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md hover:bg-black/70 hover:ring-white/40"
                  : "border-2 border-[var(--lt-reset-border)] bg-[var(--lt-reset-bg)] text-[color:var(--lt-reset-text)] hover:brightness-95",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8" cy="8" r="1.15" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="1.15" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>
          <a
            href="/gameweek"
            className="flex flex-1 items-center justify-center rounded-xl px-5 text-[13px] font-black uppercase tracking-[0.06em] transition hover:brightness-[1.06] active:scale-[0.985]"
            style={cta.style}
          >
            {cta.label}
          </a>
        </div>
      </main>
    </div>
  );
}
