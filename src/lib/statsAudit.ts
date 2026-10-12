/**
 * Cross-check oracle stats (API-Sports) against FPL's live feed to catch player-id mapping
 * mistakes before the stats hash is committed on-chain. FPL is only an independent witness for
 * "did this player play, and roughly how long"; scoring keeps using the API-Sports numbers.
 */

export type AuditOurRow = { playerId: number; minutes: number; goals: number };
export type AuditFplLive = { id: number; minutes: number; goals: number };
export type AuditCatalogRow = {
  id: number;
  webName: string;
  team: string;
  position: string;
  selectedByPercent?: number;
};

export type AuditFinding = {
  playerId: number;
  label: string;
  owned: number;
  detail: string;
};

export type StatsAuditReport = {
  /** FPL says played, our stats have 0 min / no row. */
  missing: AuditFinding[];
  /** Our stats say played, FPL says 0 min. */
  phantom: AuditFinding[];
  /** Appearance / clean-sheet 60-minute boundary disagrees. */
  tier: AuditFinding[];
  /** Goal totals differ. */
  goals: AuditFinding[];
  fixtures: { total: number; finished: number };
  blocking: number;
};

export function auditStatsAgainstFpl(input: {
  ours: AuditOurRow[];
  live: AuditFplLive[];
  catalog: AuditCatalogRow[];
  fixtures: { total: number; finished: number };
}): StatsAuditReport {
  const byId = new Map(input.catalog.map((p) => [p.id, p]));
  const ours = new Map(input.ours.map((r) => [r.playerId, r]));
  const finding = (playerId: number, detail: string): AuditFinding => {
    const p = byId.get(playerId);
    return {
      playerId,
      label: p ? `${p.webName} (${p.team}, ${p.position})` : `#${playerId}`,
      owned: p?.selectedByPercent ?? 0,
      detail,
    };
  };

  const missing: AuditFinding[] = [];
  const phantom: AuditFinding[] = [];
  const tier: AuditFinding[] = [];
  const goals: AuditFinding[] = [];

  for (const e of input.live) {
    const row = ours.get(e.id);
    const om = row?.minutes ?? 0;
    if (e.minutes > 0 && om === 0) {
      missing.push(finding(e.id, `FPL ${e.minutes}', ours ${row ? "0'" : "no row"}`));
    } else if (e.minutes === 0 && om > 0) {
      phantom.push(finding(e.id, `ours ${om}', FPL 0'`));
    } else if (e.minutes > 0 && om > 0) {
      if (e.minutes >= 60 !== om >= 60) tier.push(finding(e.id, `FPL ${e.minutes}', ours ${om}'`));
      if ((row?.goals ?? 0) !== e.goals) {
        goals.push(finding(e.id, `goals FPL ${e.goals}, ours ${row?.goals ?? 0}`));
      }
    }
  }

  const byOwned = (a: AuditFinding, b: AuditFinding) => b.owned - a.owned;
  missing.sort(byOwned);
  phantom.sort(byOwned);
  tier.sort(byOwned);
  goals.sort(byOwned);

  return {
    missing,
    phantom,
    tier,
    goals,
    fixtures: input.fixtures,
    blocking: missing.length + phantom.length,
  };
}

/** Plain-text summary for admin dialogs. */
export function formatAuditReport(r: StatsAuditReport, maxPerSection = 8): string {
  const lines: string[] = [];
  const section = (title: string, rows: AuditFinding[]) => {
    if (rows.length === 0) return;
    lines.push(`${title} (${rows.length}):`);
    for (const f of rows.slice(0, maxPerSection)) {
      lines.push(`  • ${f.label} — ${f.detail} [${f.owned.toFixed(1)}% own]`);
    }
    if (rows.length > maxPerSection) lines.push(`  … +${rows.length - maxPerSection} more`);
  };
  section("FPL says PLAYED, our stats say 0 min / no row", r.missing);
  section("Our stats say PLAYED, FPL says 0 min", r.phantom);
  section("60-minute boundary differs", r.tier);
  if (r.fixtures.finished < r.fixtures.total) {
    lines.push(
      `Only ${r.fixtures.finished}/${r.fixtures.total} fixtures finished in FPL — ` +
        "committing now locks the on-chain stats hash (mainnet cannot refresh it).",
    );
  }
  return lines.join("\n");
}
