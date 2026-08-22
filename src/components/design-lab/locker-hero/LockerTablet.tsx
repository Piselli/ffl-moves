"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import type { Player } from "@/lib/types";
import { FplPhotoAvatar } from "@/components/FplPhotoAvatar";
import { PitchChipCutout } from "./PitchChipCutout";
import { Form8Mark } from "@/components/Form8Mark";
import type { PrizeAssetContextValue } from "@/components/PrizeAssetProvider";
import type { SiteMessages } from "@/i18n/messages";
import type { SiteLocale } from "@/i18n/types";
import { DEFAULT_PRIZE_TIERS } from "@/lib/prize-distribution";
import { cn } from "@/lib/utils";
import type {
  LockerFixture,
  LockerFixturesPayload,
} from "./useLockerHeroData";
import { paletteToCssVars } from "./lockerPalettes";
import { GlassPanel } from "./GlassPanel";
import {
  getPitchStyle,
  PITCH_STYLES,
  type PitchStyleId,
} from "./pitchStyles";
import { fitPitchName } from "./pitchChipName";
import { getPitchChipFont } from "./pitchChipFonts";
import { getTypeface, typefaceToCssVars } from "./lockerTypefaces";
import {
  resolveTabletTheme,
  type TabletVariantId,
} from "./tabletVariants";
import { pl2627HomeKit } from "./pl2627HomeKits";
import { clubKitFor } from "./clubKitColors";
import {
  DEFAULT_FORMATION,
  formationRows,
  slotPosition,
  type FormationId,
} from "@/lib/formation";
import { FormationPicker } from "@/components/FormationPicker";
import { FORMATION, MAX_PER_CLUB } from "@/lib/constants";
import { PickHelpOverlay } from "./PickHelpOverlay";

type PositionFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";
type MobileTab = "pitch" | "players";

/** Emil / TripleD — snappy UI enter (never ease-in). */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING_PILL = { type: "spring" as const, stiffness: 420, damping: 34 };

function useIsNarrowTablet(): boolean {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

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
  /** Players already picked per club `teamId` — drives club-limit UI. */
  clubCounts: Record<number, number>;
  filledCount: number;
  onSlotClick: (index: number) => void;
  onClearSlot: (index: number) => void;
  onPick: (player: Player) => void;
  onReset: () => void;
  onRandom: () => void;
  pitchStyleId?: PitchStyleId;
  onPitchStyleChange?: (id: PitchStyleId) => void;
  /** Lab-only tablet chrome direction. Shipping omits → current lock. */
  tabletVariantId?: TabletVariantId;
  formationId?: FormationId;
  onFormationChange?: (id: FormationId) => void;
  /** When set, the lime CTA registers in-place instead of leaving the tablet. */
  onRegister?: () => void;
  registerLabel?: string;
  registerProgress?: string | null;
  registerBusy?: boolean;
  registerLocked?: boolean;
  registerHint?: string | null;
  /** Logged-out with a complete squad: lime CTA opens login instead of filling slots. */
  registerEntry?: boolean;
};

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

/** Freestanding bust — atlas first, same cutout as the results XI. */
function ChipCutout({
  player,
  name,
  size = 48,
}: {
  player: Player;
  name: string;
  size?: number;
}) {
  return <PitchChipCutout player={player} name={name} size={size} />;
}

/** Custom club filter — native <select> is nearly unusable inside drei Html. */
function ClubFilterSelect({
  value,
  teams,
  onChange,
  reduceMotion,
}: {
  value: string;
  teams: string[];
  onChange: (team: string) => void;
  reduceMotion: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const label = value || "All clubs";

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (team: string) => {
    onChange(team);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative mt-2">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-[color:var(--lt-ink)]/20 bg-[var(--lt-input-bg)] px-3 py-2.5 text-left text-[13px] font-semibold text-[color:var(--lt-ink)] outline-none transition-[border-color,transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "hover:border-[color:var(--lt-ink)]/35 focus-visible:border-[color:var(--lt-ink)]/40 active:scale-[0.99]",
          open && "border-[color:var(--lt-ink)]/40",
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <motion.span
          aria-hidden
          className="grid h-4 w-4 shrink-0 place-items-center text-[color:var(--lt-muted)]"
          animate={{ rotate: open ? 180 : 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.18, ease: EASE_OUT }
          }
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="listbox"
            aria-label="Filter by club"
            initial={
              reduceMotion
                ? false
                : { opacity: 0, scale: 0.97, y: -4, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: -2, filter: "blur(3px)" }
            }
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: "spring", duration: 0.32, bounce: 0.12 }
            }
            style={{ transformOrigin: "top center" }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-44 overflow-y-auto overscroll-contain rounded-xl border border-[color:var(--lt-ink)]/18 bg-[var(--lt-input-bg)] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            data-lt-scroll
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => pick("")}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-semibold transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]",
                !value
                  ? "bg-[color:var(--lt-ink)]/[0.10] text-[color:var(--lt-ink)]"
                  : "text-[color:var(--lt-soft)] hover:bg-[color:var(--lt-ink)]/[0.06] hover:text-[color:var(--lt-ink)]",
              )}
            >
              All clubs
              {!value ? (
                <span className="text-[11px] text-[color:var(--lt-accent)]">✓</span>
              ) : null}
            </button>
            {teams.map((team) => {
              const on = value === team;
              return (
                <button
                  key={team}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => pick(team)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-semibold transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]",
                    on
                      ? "bg-[color:var(--lt-ink)]/[0.10] text-[color:var(--lt-ink)]"
                      : "text-[color:var(--lt-soft)] hover:bg-[color:var(--lt-ink)]/[0.06] hover:text-[color:var(--lt-ink)]",
                  )}
                >
                  <span className="min-w-0 truncate">{team}</span>
                  {on ? (
                    <span className="ml-2 shrink-0 text-[11px] text-[color:var(--lt-accent)]">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
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
  const cutoutSize = compact ? 36 : 56;

  return (
    <span className="flex flex-col items-center">
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
  pos: Player["position"] | "SUB";
  active: boolean;
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const typeface = getTypeface();
  const plateW = compact ? 46 : PLATE_CHIP_W;
  const head = compact ? 32 : 48;

  return (
    <span
      className="flex flex-col items-center"
      style={{ width: plateW }}
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full",
          active &&
            "ring-2 ring-white/75 ring-offset-1 ring-offset-transparent",
        )}
        style={{ width: head, height: Math.round(head * 1.05) }}
      >
        {active && !reduceMotion ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-[-3px] rounded-full border border-white/50"
            animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.96, 1.06, 0.96] }}
            transition={{
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ) : null}
        <motion.span
          className={cn(
            "text-[22px] font-light",
            active ? "text-white/90" : "text-white/55",
          )}
          animate={
            active && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }
          }
          transition={
            active && !reduceMotion
              ? { duration: 1.35, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.15 }
          }
        >
          +
        </motion.span>
      </span>
      <span
        className="overflow-hidden rounded-[2px]"
        style={{ width: plateW }}
      >
        <span
          className={cn(
            "flex h-[15px] items-center justify-center px-0.5 text-center text-[9px] font-semibold",
            active ? "bg-white text-black" : "bg-white text-black/65",
          )}
          style={{ fontFamily: typeface.ui, letterSpacing: "-0.01em" }}
        >
          {pos}
        </span>
        <span
          className={cn(
            "flex h-[11px] items-center justify-center px-0.5 text-center text-[7px] font-semibold uppercase tracking-[0.06em]",
            active
              ? "bg-white/25 text-white"
              : "bg-black/45 text-white/70",
          )}
        >
          {active ? "Now" : "Pick"}
        </span>
      </span>
    </span>
  );
}

/** Slim bench row — lives below the pitch on mobile, never overlays GK. */
function MobileBenchBar({
  bench,
  activeSlot,
  onClearSlot,
  onSlotClick,
}: {
  bench: (Player | null)[];
  activeSlot: number | null;
  onClearSlot: (index: number) => void;
  onSlotClick: (index: number) => void;
}) {
  return (
    <div className="order-2 flex shrink-0 flex-col gap-1 md:hidden">
      <p className="px-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--lt-muted)]">
        Subs
      </p>
      <div className="flex gap-1">
        {bench.slice(0, 3).map((p, i) => {
          const slotIndex = 11 + i;
          const active = activeSlot === slotIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                p ? onClearSlot(slotIndex) : onSlotClick(slotIndex)
              }
              className={cn(
                "flex min-h-[34px] min-w-0 flex-1 items-center gap-1 rounded-xl border px-1.5 py-1 transition active:scale-[0.98]",
                active
                  ? "border-[color:var(--lt-accent)]/45 bg-[color:var(--lt-accent-soft)]"
                  : "border-[color:var(--lt-ink)]/15 bg-[color:var(--lt-ink)]/[0.06]",
              )}
              aria-label={
                p ? (p.webName ?? p.name) : `Empty bench ${i + 1}`
              }
            >
              {p ? (
                <>
                  <FplPhotoAvatar
                    fplPhotoCode={p.fplPhotoCode}
                    apiId={p.apiId}
                    photoUrl={p.photo}
                    alt={p.webName ?? p.name}
                    size={24}
                    teamName={p.team}
                    initials={p.webName ?? p.name}
                    className="shrink-0 rounded-md"
                    eager
                  />
                  <span className="min-w-0 truncate text-[10px] font-bold leading-tight text-[color:var(--lt-ink)]">
                    {p.webName ?? p.name}
                  </span>
                </>
              ) : (
                <span className="w-full text-center text-[10px] font-semibold text-[color:var(--lt-muted)]">
                  + SUB
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
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
  interactive = false,
  onClubSelect,
}: {
  match: LockerFixture;
  locale: SiteLocale;
  interactive?: boolean;
  /** Filter players list to this club's full name. */
  onClubSelect?: (clubName: string) => void;
}) {
  const badge =
    "h-7 w-7 shrink-0 object-contain";

  const ClubSide = ({
    side,
    align,
  }: {
    side: LockerFixture["teamH"];
    align: "start" | "end";
  }) => {
    const body = (
      <>
        {align === "start" ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={side.badge}
              alt=""
              className={badge}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0";
              }}
            />
            <span className="truncate text-[13px] font-extrabold leading-none text-[color:var(--lt-ink)]">
              {side.shortName}
            </span>
          </>
        ) : (
          <>
            <span className="truncate text-right text-[13px] font-extrabold leading-none text-[color:var(--lt-ink)]">
              {side.shortName}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={side.badge}
              alt=""
              className={badge}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0";
              }}
            />
          </>
        )}
      </>
    );

    if (!onClubSelect) {
      return (
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2",
            align === "end" && "justify-end",
          )}
        >
          {body}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onClubSelect(side.name)}
        title={`Show ${side.name} players`}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
          align === "start" ? "justify-start pr-1" : "justify-end pl-1",
          "hover:bg-white/[0.08] active:scale-[0.98]",
        )}
      >
        {body}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "flex min-h-[32px] items-center gap-1.5 px-1 py-0.5",
        interactive && !onClubSelect && "rounded-lg hover:bg-white/[0.04]",
      )}
    >
      <ClubSide side={match.teamH} align="start" />
      <span className="shrink-0 text-[12px] font-bold tabular-nums tracking-tight text-[color:var(--lt-ink)]">
        {formatKickoffTime(match.kickoffTime, locale)}
      </span>
      <ClubSide side={match.teamA} align="end" />
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
  clubCounts,
  filledCount,
  onSlotClick,
  onClearSlot,
  onPick,
  onReset,
  onRandom,
  pitchStyleId = "night-turf",
  onPitchStyleChange,
  tabletVariantId = "crystal",
  formationId = DEFAULT_FORMATION,
  onFormationChange,
  onRegister,
  registerLabel,
  registerProgress = null,
  registerBusy = false,
  registerLocked = false,
  registerHint = null,
  registerEntry = false,
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const { variant: tabletVariant, palette, cta } =
    resolveTabletTheme(tabletVariantId);
  const pitch = getPitchStyle(pitchStyleId);
  const typeface = getTypeface();
  const useMaterialShell =
    palette.mode === "dark" || palette.material === "glass";
  /** Locked panel material — frosted glass. */
  const isGlass = useMaterialShell;
  const chrome = tabletVariant.chrome;
  const isGhost = chrome === "ghost";
  const isLinear = chrome === "linear";
  const isSignal = chrome === "signal";
  const isAuthkit = chrome === "authkit";
  const isCrystal = chrome === "crystal";
  /**
   * Product micro-motion ships on every look (incl. Crystal homepage).
   * Chrome id only shapes corners / glass, not whether press/spring exists.
   */
  const isMotionChrome = true;
  const isPlatesChrome = isAuthkit || isCrystal;
  const isTripledChrome = isGhost || isLinear || isCrystal;
  const interactivePanels = isGhost || isAuthkit || isSignal || isCrystal;
  const PANEL = cn(
    "rounded-2xl bg-[var(--lt-panel)] ring-1 ring-[var(--lt-panel-ring)] shadow-[var(--lt-panel-shadow)]",
    interactivePanels &&
      "transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:brightness-[1.03]",
  );
  const Panel = useMaterialShell ? GlassPanel : "div";
  const glassProps = useMaterialShell
    ? {
        interactive: interactivePanels,
        crystal: isCrystal,
      }
    : {};
  const crystalVars: CSSProperties = isCrystal
    ? {
        ["--lt-glass-bg" as string]: "rgba(8,10,14,0.42)",
        ["--lt-glass-blur" as string]: "48px",
        ["--lt-glass-ring" as string]: "rgba(255,255,255,0.38)",
        ["--lt-glass-shadow" as string]:
          "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -20px 40px rgba(0,0,0,0.5), 0 18px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        ["--lt-glass-sheen" as string]:
          "linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 18%, transparent 42%), linear-gradient(320deg, rgba(120,180,255,0.08) 0%, transparent 35%)",
        ["--lt-panel" as string]: "rgba(8,10,14,0.38)",
        ["--lt-hairline" as string]: "rgba(255,255,255,0.32)",
      }
    : {};
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState<PositionFilter>("ALL");
  const [teamFilter, setTeamFilter] = useState("");
  const [clock, setClock] = useState("");
  const [flashPickId, setFlashPickId] = useState<number | null>(null);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [howtoOpen, setHowtoOpen] = useState(false);
  const pickCopy = m.pages.lockerPick;
  const [mobileTab, setMobileTab] = useState<MobileTab>("pitch");
  const isNarrow = useIsNarrowTablet();
  const tabletRootRef = useLocalWheelScroll();

  const handleSlotClick = useCallback(
    (idx: number) => {
      const empty = idx < 11 ? !starters[idx] : !bench[idx - 11];
      onSlotClick(idx);
      if (empty) setMobileTab("players");
    },
    [bench, onSlotClick, starters],
  );

  const onRegisterClick = useCallback(() => {
    if (registerEntry) {
      onRegister?.();
      return;
    }
    if (filledCount < FORMATION.TOTAL) {
      const emptyStarter = starters.findIndex((p) => !p);
      if (emptyStarter >= 0) {
        onSlotClick(emptyStarter);
        setMobileTab("players");
        return;
      }
      const emptyBench = bench.findIndex((p) => !p);
      if (emptyBench >= 0) {
        onSlotClick(11 + emptyBench);
        setMobileTab("players");
        return;
      }
      return;
    }
    onRegister?.();
  }, [
    bench,
    filledCount,
    onRegister,
    onSlotClick,
    registerEntry,
    starters,
  ]);

  /** Selecting an empty pitch slot scopes the list to that position. */
  useEffect(() => {
    if (activeSlot == null) return;
    if (activeSlot >= 11) {
      setPosFilter("ALL");
      return;
    }
    setPosFilter(slotPosition(activeSlot, formationId));
  }, [activeSlot, formationId]);

  useEffect(() => {
    if (flashPickId == null) return;
    const id = window.setTimeout(() => setFlashPickId(null), 280);
    return () => window.clearTimeout(id);
  }, [flashPickId]);

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

  /** Map fixture club name → players.team label used by the filter. */
  const resolveClubFilter = useCallback(
    (fixtureClubName: string) => {
      const exact = uniqueTeams.find((t) => t === fixtureClubName);
      if (exact) return exact;
      const lower = fixtureClubName.toLowerCase();
      const ci = uniqueTeams.find((t) => t.toLowerCase() === lower);
      if (ci) return ci;
      const partial = uniqueTeams.find(
        (t) =>
          t.toLowerCase().includes(lower) ||
          lower.includes(t.toLowerCase()),
      );
      return partial ?? fixtureClubName;
    },
    [uniqueTeams],
  );

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

  const rows = formationRows(formationId);
  const slotPos = (i: number) => slotPosition(i, formationId);
  const chipCompact = isNarrow;
  const prizeLabel =
    prizePoolRaw == null
      ? "—"
      : prize.formatHero(prizePoolRaw, locale === "uk" ? "uk" : "en");
  const deadlineLabel =
    !deadline || !deadlineParts
      ? "—"
      : deadlineParts.expired
        ? m.home.deadlinePassed
        : `${String(deadlineParts.h).padStart(2, "0")}h ${String(deadlineParts.m).padStart(2, "0")}m`;
  const managersLabel = entries == null ? "—" : String(entries);

  return (
    <div
      ref={tabletRootRef}
      data-lt-chrome={tabletVariant.chrome}
      className="relative flex h-full w-full flex-col overflow-hidden max-md:pb-0 md:pb-2.5"
      style={
        {
          color: "var(--lt-ink)",
          background: "var(--lt-canvas)",
          fontFamily: "var(--lt-font-ui)",
          WebkitFontSmoothing: "subpixel-antialiased",
          textRendering: "geometricPrecision",
          ...paletteToCssVars(palette),
          ...typefaceToCssVars(typeface),
          ...crystalVars,
        } as CSSProperties
      }
    >
      <div className="relative hidden h-7 shrink-0 items-center justify-between px-5 text-[10px] font-semibold tabular-nums text-[color:var(--lt-ink)] md:flex">
        <span>{clock}</span>
        <span className="tracking-[0.08em]">Wi-Fi&nbsp;&nbsp;100%</span>
      </div>

      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between border-b border-[var(--lt-hairline)] max-md:h-10 max-md:px-3 md:h-[52px] md:px-5",
          isGlass && chrome === "current" && "border-white/60 bg-black",
          isGlass &&
            (isTripledChrome || isMotionChrome || isPlatesChrome) &&
            "bg-black/40 backdrop-blur-md",
          isCrystal && "border-white/35 bg-black/30 backdrop-blur-xl",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Form8Mark
            className={cn(
              "hidden h-9 shrink-0 md:block",
              isMotionChrome &&
                "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105",
            )}
          />
          <div className="min-w-0">
            <p
              className="truncate text-[14px] font-black leading-none text-[color:var(--lt-ink)] md:text-[17px]"
              style={DISPLAY}
            >
              Pick your team
            </p>
            <p className="mt-0.5 truncate text-[9px] font-semibold text-[color:var(--lt-muted)] md:mt-1 md:text-[10px]">
              <span className="md:hidden">
                GW {gwId ?? "—"} · {filledCount}/{FORMATION.TOTAL}
              </span>
              <span className="hidden md:inline">FORM8 Fantasy EPL</span>
            </p>
          </div>
        </div>

        <nav
          aria-label={pickCopy.howToPlayBtn}
          className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 px-1 sm:gap-2.5"
        >
          <button
            type="button"
            onClick={() => setHowtoOpen(true)}
            className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--lt-muted)] transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-[color:var(--lt-ink)] active:scale-[0.98] sm:text-[11px]"
          >
            {pickCopy.howToPlayBtn}
          </button>
          <span
            aria-hidden
            className="text-[10px] font-semibold text-[color:var(--lt-ink)]/25"
          >
            ·
          </span>
          <button
            type="button"
            onClick={() => setScoringOpen(true)}
            className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--lt-muted)] transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-[color:var(--lt-ink)] active:scale-[0.98] sm:text-[11px]"
          >
            {pickCopy.scoringBtn}
          </button>
        </nav>

        <div className="hidden shrink-0 text-right md:block">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--lt-muted)]">
            Selected
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[color:var(--lt-ink)]">
            {filledCount} of {FORMATION.TOTAL}
          </p>
        </div>
        <div className="w-14 shrink-0 md:hidden" aria-hidden />
      </header>

      <div className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-[var(--lt-hairline)] px-3 py-2 md:hidden">
        <div className="min-w-0 rounded-lg bg-[color:var(--lt-ink)]/[0.05] px-2 py-1.5">
          <p className="truncate text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--lt-muted)]">
            Pool
          </p>
          <p
            className="mt-0.5 truncate text-[11px] font-black tabular-nums leading-none text-[color:var(--lt-ink)]"
            style={DISPLAY}
          >
            {prizeLabel}
          </p>
        </div>
        <div className="min-w-0 rounded-lg bg-[color:var(--lt-ink)]/[0.05] px-2 py-1.5">
          <p className="truncate text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--lt-muted)]">
            Deadline
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-[11px] font-black tabular-nums leading-none",
              isGlass ? "text-white" : "text-[color:var(--lt-accent)]",
            )}
            style={isGlass ? DISPLAY : { ...DISPLAY, color: "var(--lt-accent)" }}
          >
            {deadlineLabel}
          </p>
        </div>
        <div className="min-w-0 rounded-lg bg-[color:var(--lt-ink)]/[0.05] px-2 py-1.5">
          <p className="truncate text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--lt-muted)]">
            Managers
          </p>
          <p
            className="mt-0.5 truncate text-[11px] font-black tabular-nums leading-none text-[color:var(--lt-ink)]"
            style={DISPLAY}
          >
            {managersLabel}
          </p>
        </div>
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2 pt-2 max-md:px-2.5 md:gap-2.5 md:p-3 md:pt-2.5 md:grid md:auto-rows-auto md:grid-cols-[minmax(230px,0.92fr)_minmax(0,1.28fr)_minmax(280px,0.98fr)] md:grid-rows-[minmax(0,1fr)_auto] md:overflow-hidden">
        <Panel
          {...(useMaterialShell
            ? { as: "section" as const, ...glassProps }
            : {})}
          className={cn(
            !useMaterialShell && PANEL,
            "order-2 flex min-h-0 flex-col p-3 max-md:hidden md:order-none md:col-start-1 md:row-start-1",
            isPlatesChrome && "rounded-[22px]",
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

          <div
            data-lt-scroll
            className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-0.5 py-0.5"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            {dayGroups.length === 0 ? (
              <p className="px-1 py-3 text-[12px] text-[color:var(--lt-muted)]">
                Loading fixtures…
              </p>
            ) : (
              dayGroups.map((group) => (
                <div key={group.key} className="flex shrink-0 flex-col gap-1">
                  <div className="flex shrink-0 items-center gap-2 px-1 pb-0.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--lt-ink)]">
                      {group.label}
                    </p>
                    <div className="h-px flex-1 bg-[color:var(--lt-ink)]/25" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {group.matches.map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        locale={locale}
                        interactive={isMotionChrome}
                        onClubSelect={(name) =>
                          setTeamFilter(resolveClubFilter(name))
                        }
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Pitch — flat top-down; scheme / turf chrome in bottom fringe */}
        <section
          className={cn(
            "relative order-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl ring-1 md:order-none md:col-start-2 md:row-start-1 md:min-h-0 md:flex-none",
            mobileTab !== "pitch" && "max-md:hidden",
            pitch.ring,
            isPlatesChrome && "rounded-[22px]",
            interactivePanels &&
              "transition-[transform,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-[1.03]",
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

          {/*
            Bottom fringe chrome — sits in green pockets beside GK,
            below chalk goal line (chalk uses a deeper bottom inset).
          */}
          {onFormationChange ? (
            <div className="absolute bottom-0.5 left-2 z-20">
              <FormationPicker
                value={formationId}
                onChange={onFormationChange}
                size="xs"
              />
            </div>
          ) : null}
          {onPitchStyleChange ? (
            <div
              className="absolute bottom-0.5 right-2 z-20 hidden items-center gap-1 rounded-full bg-black/45 p-1 ring-1 ring-white/15 backdrop-blur-sm md:flex"
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
          ) : null}

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

          <div className="relative z-10 flex h-full min-h-0 flex-col justify-evenly px-0.5 py-0.5 md:py-1">
            {rows.map((row) => (
              <div key={row.join("-")} className="flex justify-evenly gap-0.5">
                {row.map((idx) => {
                  const p = starters[idx];
                  const pos = slotPos(idx);
                  const active = activeSlot === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => (p ? onClearSlot(idx) : handleSlotClick(idx))}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl bg-transparent transition-[transform,opacity,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.96]",
                        "h-[clamp(88px,27vw,108px)] w-[clamp(60px,20vw,82px)]",
                        "max-md:h-[clamp(40px,10vw,52px)] max-md:w-[clamp(34px,8.8vw,44px)]",
                        p && "max-md:overflow-visible max-md:[&>span]:origin-bottom max-md:[&>span]:scale-[0.78]",
                        active && !p && "opacity-100",
                        active && p && "brightness-110",
                        isMotionChrome &&
                          "hover:-translate-y-0.5 hover:brightness-125 active:scale-[0.94]",
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
                        <PitchPlayerChip player={p} compact={chipCompact} />
                      ) : (
                        <PitchEmptyChip pos={pos} active={active} compact={chipCompact} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {mobileTab === "pitch" ? (
          <MobileBenchBar
            bench={bench}
            activeSlot={activeSlot}
            onClearSlot={onClearSlot}
            onSlotClick={handleSlotClick}
          />
        ) : null}

        <Panel
          {...(useMaterialShell
            ? { as: "section" as const, ...glassProps }
            : {})}
          className={cn(
            !useMaterialShell && PANEL,
            "order-3 flex min-h-0 flex-col overflow-hidden p-3 md:order-none md:col-start-3 md:row-start-1 md:min-h-0",
            mobileTab !== "players" && "max-md:hidden",
            "max-md:flex-1",
            isPlatesChrome && "rounded-[22px]",
          )}
        >
          <div className="shrink-0">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-[color:var(--lt-ink)]">
                  {pickCopy.playersTitle}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[color:var(--lt-muted)]">
                  {pickCopy.playersSubtitle}
                </p>
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-[color:var(--lt-muted)]">
                {pickCopy.playersFound(filtered.length)}
              </span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players"
              className="w-full rounded-xl border border-[color:var(--lt-ink)]/20 bg-[var(--lt-input-bg)] px-3 py-2.5 text-[13px] text-[color:var(--lt-ink)] outline-none transition-[border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] placeholder:text-[color:var(--lt-muted)] focus:border-[color:var(--lt-ink)]/40"
            />
            <ClubFilterSelect
              value={teamFilter}
              teams={uniqueTeams}
              onChange={setTeamFilter}
              reduceMotion={reduceMotion}
            />
            <div
              className={cn(
                "mt-2 flex gap-1 bg-[var(--lt-chip-track)] p-1",
                isTripledChrome || isMotionChrome
                  ? "rounded-full"
                  : "rounded-xl",
              )}
            >
              <LayoutGroup id="lt-pos-chips">
                {(["ALL", "GK", "DEF", "MID", "FWD"] as PositionFilter[]).map(
                  (pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosFilter(pos)}
                      className={cn(
                        "relative flex-1 px-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                        isTripledChrome || isMotionChrome
                          ? "rounded-full"
                          : "rounded-lg",
                        posFilter === pos
                          ? "text-[color:var(--lt-chip-active-text)]"
                          : "text-[color:var(--lt-faint)] hover:text-[color:var(--lt-ink)]",
                        "active:scale-[0.96]",
                      )}
                    >
                      {posFilter === pos ? (
                        <motion.span
                          layoutId="lt-pos-pill"
                          className="absolute inset-0 rounded-full bg-[var(--lt-chip-active)] shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : SPRING_PILL
                          }
                        />
                      ) : null}
                      <span className="relative z-10">{pos}</span>
                    </button>
                  ),
                )}
              </LayoutGroup>
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
                const clubCapped =
                  !taken && (clubCounts[p.teamId] ?? 0) >= MAX_PER_CLUB;
                const flash = flashPickId === p.id;
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    disabled={taken || clubCapped}
                    aria-disabled={taken || clubCapped}
                    onClick={() => {
                      if (taken || clubCapped) return;
                      onPick(p);
                      setFlashPickId(p.id);
                    }}
                    className={cn(
                      "group relative flex w-full items-center gap-3 px-1.5 py-2 text-left transition-[transform,background-color,opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      taken && "cursor-default opacity-40",
                      clubCapped &&
                        "cursor-default opacity-[0.48] saturate-[0.4]",
                      !taken &&
                        !clubCapped &&
                        "rounded-xl hover:bg-[color:var(--lt-ink)]/[0.08] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] active:scale-[0.985]",
                      flash && !taken && !clubCapped && "bg-[color:var(--lt-ink)]/[0.10]",
                    )}
                  >
                    <span
                      className={cn(
                        "transition-[filter,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                        clubCapped && "brightness-[0.72]",
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
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-[color:var(--lt-ink)]">
                        {p.webName ?? p.name}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--lt-muted)]">
                        {p.position} · {p.team}
                      </p>
                    </div>
                    {clubCapped ? (
                      <span className="flex shrink-0 flex-col items-end gap-0.5 self-center">
                        <p
                          className="text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--lt-muted)]"
                          style={DISPLAY}
                        >
                          {pickCopy.clubLimitBadge}
                        </p>
                        <p className="max-w-[5.5rem] text-right text-[10px] font-semibold leading-tight text-[color:var(--lt-soft)]">
                          {pickCopy.clubLimitTip}
                        </p>
                      </span>
                    ) : (
                      <motion.span
                        className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full text-[16px] font-bold"
                        animate={
                          flash && !reduceMotion
                            ? { scale: [1, 0.88, 1.08, 1] }
                            : { scale: 1 }
                        }
                        transition={
                          flash
                            ? { duration: 0.28, ease: EASE_OUT }
                            : { duration: 0.12 }
                        }
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
                        {taken ? "·" : "+"}
                      </motion.span>
                    )}
                  </motion.button>
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          {...(useMaterialShell ? glassProps : {})}
          className={cn(
            !useMaterialShell && PANEL,
            "order-4 px-3.5 py-2.5 max-md:hidden md:order-none md:col-start-1 md:row-start-2",
            isPlatesChrome && "rounded-[22px]",
          )}
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

        <div className="order-5 grid grid-cols-2 gap-2.5 max-md:hidden md:order-none md:col-start-2 md:row-start-2">
          <Panel
            {...(useMaterialShell ? glassProps : {})}
            className={cn(
              !useMaterialShell && PANEL,
              "px-3.5 py-2.5",
              isPlatesChrome && "rounded-[22px]",
            )}
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
            {...(useMaterialShell ? glassProps : {})}
            className={cn(
              !useMaterialShell && PANEL,
              "px-3.5 py-2.5",
              isPlatesChrome && "rounded-[22px]",
            )}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--lt-muted)]">
              3 substitutes
            </p>
            <div className="mt-1.5 flex min-w-0 items-end justify-evenly gap-1.5">
              {bench.slice(0, 3).map((p, i) => {
                const slotIndex = 11 + i;
                const active = activeSlot === slotIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      p ? onClearSlot(slotIndex) : onSlotClick(slotIndex)
                    }
                    className="flex min-w-0 flex-1 justify-center rounded-lg transition-[transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.96]"
                    aria-label={
                      p
                        ? p.webName ?? p.name
                        : `Empty bench ${i + 1}`
                    }
                  >
                    {p ? (
                      <PitchPlayerChip player={p} compact />
                    ) : (
                      <PitchEmptyChip
                        pos="SUB"
                        active={active}
                        compact
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="relative order-6 flex h-full min-h-0 items-stretch gap-2 max-md:hidden md:order-none md:col-start-3 md:row-start-2">
          {registerHint ? (
            <p className="pointer-events-none absolute inset-x-0 -top-5 truncate text-[10px] font-semibold leading-none text-amber-100/90">
              {registerHint}
            </p>
          ) : null}
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset"
              title="Reset"
              className={cn(
                "grid h-11 w-11 place-items-center transition active:scale-[0.96]",
                isTripledChrome || isMotionChrome
                  ? "rounded-full"
                  : "rounded-xl",
                isGlass
                  ? "bg-black/55 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md hover:bg-black/70"
                  : "border-2 border-[var(--lt-reset-border)] bg-[var(--lt-reset-bg)] text-[color:var(--lt-reset-text)] hover:brightness-95",
                isGlass &&
                  (isTripledChrome || isMotionChrome || isPlatesChrome
                    ? "ring-1 ring-[color:var(--lt-glass-ring)]"
                    : "ring-1 ring-white/25 hover:ring-white/40"),
                isMotionChrome &&
                  "duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 active:scale-[0.92]",
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
                "grid h-11 w-11 place-items-center transition active:scale-[0.96]",
                isTripledChrome || isMotionChrome
                  ? "rounded-full"
                  : "rounded-xl",
                isGlass
                  ? "bg-black/55 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md hover:bg-black/70"
                  : "border-2 border-[var(--lt-reset-border)] bg-[var(--lt-reset-bg)] text-[color:var(--lt-reset-text)] hover:brightness-95",
                isGlass &&
                  (isTripledChrome || isMotionChrome || isPlatesChrome
                    ? "ring-1 ring-[color:var(--lt-glass-ring)]"
                    : "ring-1 ring-white/25 hover:ring-white/40"),
                isMotionChrome &&
                  "duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 active:scale-[0.92]",
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
          <button
            type="button"
            onClick={onRegisterClick}
            disabled={registerBusy || registerLocked || !onRegister}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg px-5 text-[18px] font-black uppercase leading-none tracking-[0.04em] transition hover:brightness-[1.06] active:scale-[0.985]",
              isMotionChrome &&
                "duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 hover:shadow-[0_0_28px_rgba(0,249,72,0.22)] active:scale-[0.97]",
              (registerBusy || registerLocked || !onRegister) &&
                "cursor-default opacity-80 hover:brightness-100 hover:shadow-none active:scale-100",
            )}
            style={cta.style}
          >
            <span>{registerLabel ?? cta.label}</span>
            {registerProgress ? (
              <span className="text-[13px] font-bold tracking-[0.14em] opacity-90">
                {registerProgress}
              </span>
            ) : null}
          </button>
        </div>
      </main>

      <div className="shrink-0 border-t border-[var(--lt-hairline)] bg-[var(--lt-canvas)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        {registerHint ? (
          <p className="mb-2 truncate text-center text-[10px] font-semibold leading-none text-amber-100/90">
            {registerHint}
          </p>
        ) : null}
        {filledCount >= FORMATION.TOTAL ? (
          <button
            type="button"
            onClick={onRegisterClick}
            disabled={registerBusy || registerLocked || !onRegister}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg px-5 py-3.5 text-[16px] font-black uppercase leading-none tracking-[0.04em] transition hover:brightness-[1.06] active:scale-[0.985]",
              isMotionChrome &&
                "duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 hover:shadow-[0_0_28px_rgba(0,249,72,0.22)] active:scale-[0.97]",
              (registerBusy || registerLocked || !onRegister) &&
                "cursor-default opacity-80 hover:brightness-100 hover:shadow-none active:scale-100",
            )}
            style={cta.style}
          >
            <span>{registerLabel ?? cta.label}</span>
            {registerProgress ? (
              <span className="text-[12px] font-bold tracking-[0.14em] opacity-90">
                {registerProgress}
              </span>
            ) : null}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileTab("pitch")}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 transition-[color,transform] duration-150 active:scale-[0.97]",
                mobileTab === "pitch"
                  ? "bg-[color:var(--lt-accent-soft)] text-[color:var(--lt-accent)]"
                  : "text-[color:var(--lt-muted)] hover:text-[color:var(--lt-ink)]",
              )}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">
                Team
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("players")}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 transition-[color,transform] duration-150 active:scale-[0.97]",
                mobileTab === "players"
                  ? "bg-[color:var(--lt-accent-soft)] text-[color:var(--lt-accent)]"
                  : "text-[color:var(--lt-muted)] hover:text-[color:var(--lt-ink)]",
              )}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
                />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">
                Pick
              </span>
            </button>
            <button
              type="button"
              onClick={onRandom}
              aria-label="Random squad"
              title="Random squad"
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition active:scale-[0.96]",
                isGlass
                  ? "bg-black/55 text-white ring-1 ring-[color:var(--lt-glass-ring)] backdrop-blur-md"
                  : "border-2 border-[var(--lt-reset-border)] bg-[var(--lt-reset-bg)] text-[color:var(--lt-reset-text)]",
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
            <button
              type="button"
              onClick={onRegisterClick}
              disabled={registerBusy || registerLocked || !onRegister}
              className={cn(
                "flex min-w-0 flex-[1.4] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2.5 text-[13px] font-black uppercase leading-none tracking-[0.04em] transition active:scale-[0.985]",
                isMotionChrome &&
                  "duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.97]",
                (registerBusy || registerLocked || !onRegister) &&
                  "cursor-default opacity-80 active:scale-100",
              )}
              style={cta.style}
            >
              <span className="truncate">{registerLabel ?? cta.label}</span>
              <span className="text-[10px] font-bold tabular-nums opacity-90">
                {filledCount}/{FORMATION.TOTAL}
              </span>
            </button>
          </div>
        )}
      </div>

      <PickHelpOverlay
        kind="scoring"
        open={scoringOpen}
        onClose={() => setScoringOpen(false)}
        messages={m}
      />
      <PickHelpOverlay
        kind="howto"
        open={howtoOpen}
        onClose={() => setHowtoOpen(false)}
        messages={m}
      />
    </div>
  );
}
