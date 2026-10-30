"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { PartnerLoginModal } from "@/components/partners/PartnerLoginModal";
import { SeasonPageWash } from "@/components/season/seasonPageChrome";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import { useWallet } from "@/hooks/useSolanaWallet";
import { buildShortReferralLink, normalizeRefCode } from "@/lib/referralClient";
import { cn, shortenAddress } from "@/lib/utils";

type ReferralStat = {
  code: string;
  link?: string;
  clicks: number;
  signups: number;
  conversionRate: number;
  firstSeen: number | null;
  lastActivity: number | null;
  estimatedFeeVolumeUsdc: number;
};

type CampaignStat = ReferralStat & { campaign: string };

type MeResponse = {
  authenticated: boolean;
  wallet?: string;
  partner?: { id: string; label: string; codes: string[] };
};

type StatsResponse = {
  partner: { id: string; label: string; codes: string[] };
  durable: boolean;
  totals: {
    clicks: number;
    signups: number;
    conversionRate: number;
    estimatedFeeVolumeUsdc: number;
  };
  codes: ReferralStat[];
  campaigns?: CampaignStat[];
  conversions?: { wallet: string; code: string; campaign: string }[];
};

const BASE_URL = "https://www.form8.football";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms)
    .toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    .replace(/\s*р\.?\s*$/u, "");
}

function fmtFee(n: number): string {
  return Number(n ?? 0).toFixed(1);
}

/** Side rail: Your codes + How links work share this width. */
const SIDE_GRID = "grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]";

const LABEL =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-white/60";
const TH =
  "py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70";
const QUIET_BTN =
  "rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/80 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white disabled:opacity-40";

type StatTableRow =
  | { kind: "code"; stat: ReferralStat }
  | { kind: "campaign"; stat: CampaignStat };

export function PartnerCabinetShell() {
  const reduceMotion = useReducedMotion();
  const { address, signMessage } = useWallet();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [booting, setBooting] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState("");
  const [newCode, setNewCode] = useState("");
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("err");
    if (err === "use_wallet") {
      setError("Email / invite login is off. Connect a whitelisted wallet and sign.");
      window.history.replaceState({}, "", "/partners");
    }
  }, []);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/partners/me", { cache: "no-store" });
    const body = (await res.json()) as MeResponse;
    setMe(body);
    return body;
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/stats", { cache: "no-store" });
      if (res.status === 401) {
        setData(null);
        setError("Session expired. Sign in again.");
        return;
      }
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        return;
      }
      const body = (await res.json()) as StatsResponse;
      setData(body);
      setSelectedCode((prev) => prev || body.partner.codes[0] || "");
    } catch {
      setError("Could not load stats.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refreshAuthed = useCallback(async () => {
    const body = await loadMe();
    if (body.authenticated) await loadStats();
  }, [loadMe, loadStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshAuthed();
      } catch {
        if (!cancelled) setError("Could not check session.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAuthed]);

  const generatedLink = useMemo(() => {
    const code = normalizeRefCode(selectedCode);
    if (!code) return "";
    return buildShortReferralLink(BASE_URL, code, newCampaign.trim() || null);
  }, [selectedCode, newCampaign]);

  const hasCreatives = (data?.campaigns?.length ?? 0) > 0;

  const tableRows = useMemo((): StatTableRow[] => {
    if (!data) return [];
    const byCode = new Map<string, CampaignStat[]>();
    for (const c of data.campaigns ?? []) {
      const list = byCode.get(c.code) ?? [];
      list.push(c);
      byCode.set(c.code, list);
    }
    const rows: StatTableRow[] = [];
    for (const code of data.codes) {
      rows.push({ kind: "code", stat: code });
      for (const camp of byCode.get(code.code) ?? []) {
        rows.push({ kind: "campaign", stat: camp });
      }
    }
    return rows;
  }, [data]);

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/partners/auth/logout", { method: "POST" });
    setMe({ authenticated: false });
    setData(null);
  }, []);

  const createCode = useCallback(async () => {
    const code = normalizeRefCode(newCode);
    if (!code || !address || !signMessage) {
      setError(!address ? "Connect your partner wallet." : "Enter a valid code.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const ts = Date.now();
      const message = `FORM8 partner create code\nWallet: ${address}\nCode: ${code}\nTs: ${ts}`;
      const signature = await signMessage(message);
      if (!signature) {
        setError("Signature cancelled.");
        return;
      }
      const res = await fetch("/api/partners/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, wallet: address, ts, signature }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Could not create code (${res.status})`);
        return;
      }
      setData(body as StatsResponse);
      setSelectedCode(code);
      setNewCode("");
      await loadMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create code");
    } finally {
      setCreating(false);
    }
  }, [address, loadMe, newCode, signMessage]);

  const authed = !!me?.authenticated && !!data;
  const conversionCount = data?.conversions?.length ?? data?.totals.signups ?? 0;

  return (
    <div className="relative min-h-screen bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      <PartnerLoginModal
        open={!booting && !me?.authenticated}
        error={error}
        onSignedIn={refreshAuthed}
      />

      <div className={cn("relative mx-auto max-w-7xl px-5 sm:px-8", PRODUCT_PAGE_TOP, "pb-16")}>
        {booting ? <p className="py-12 text-sm text-white/35">Loading…</p> : null}

        {authed ? (
          <>
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  Partner · {data.partner.label}
                </p>
                <h1 className="mt-0.5 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-[2rem]">
                  Partners cabinet
                </h1>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="font-mono text-[11px] text-white/40">
                  {shortenAddress(me.wallet ?? "")}
                </p>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/30 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </header>

            {error && me.authenticated ? (
              <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100/90">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-5">
              {/* Stats + Your codes */}
              <div className={SIDE_GRID}>
                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-5 sm:px-5 sm:py-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className={LABEL}>Registrations</p>
                      <p className="mt-1 font-display text-4xl font-black tabular-nums tracking-tight text-white sm:text-[2.75rem]">
                        {data.totals.signups.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={LABEL}>Clicks</p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums text-white">
                        {data.totals.clicks.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={LABEL}>CR</p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums text-white">
                        {pct(data.totals.conversionRate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={LABEL}>Fee vol</p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums text-white">
                        {fmtFee(data.totals.estimatedFeeVolumeUsdc)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={LABEL}>Wallets</p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums text-white">
                        {conversionCount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!data.durable ? (
                    <p className="mt-4 text-[11px] text-amber-200/70">
                      Storage is in-memory or Redis unreachable — numbers may reset.
                    </p>
                  ) : null}
                </GlassPanel>

                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-4">
                  <p className={LABEL}>Your codes</p>
                  <ul className="mt-3 flex-1 space-y-2">
                    {data.partner.codes.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCode(c);
                            copy(buildShortReferralLink(BASE_URL, c), `code-${c}`);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition",
                            selectedCode === c
                              ? "border-white/30 bg-white/[0.08]"
                              : "border-white/12 bg-black/30 hover:border-white/22",
                          )}
                        >
                          <span className="font-mono text-sm text-white/90">{c}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                            {copied === `code-${c}` ? "Copied" : "Copy"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </GlassPanel>
              </div>

              {/* Create link + How links work — same side rail width */}
              <div className={SIDE_GRID}>
                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-5 sm:px-5">
                  <p className={LABEL}>Create link</p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-white/70">
                        New referral code
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value)}
                          placeholder="e.g. bonus50-tg"
                          className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/28 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={creating || !newCode.trim()}
                          onClick={() => void createCode()}
                          className={cn(QUIET_BTN, "shrink-0 px-4")}
                        >
                          {creating ? "Creating…" : "Create code"}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.08] pt-4">
                      <p className="mb-1.5 text-[12px] font-medium text-white/70">
                        Creative under a code
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          value={selectedCode}
                          onChange={(e) => setSelectedCode(e.target.value)}
                          className="rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-white/28 focus:outline-none sm:w-40"
                        >
                          {data.partner.codes.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          value={newCampaign}
                          onChange={(e) => setNewCampaign(e.target.value)}
                          placeholder="stories-1, creo1…"
                          className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/28 focus:outline-none"
                        />
                      </div>
                    </div>

                    {generatedLink ? (
                      <div className="border-t border-white/[0.08] pt-4">
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 font-mono text-[13px] text-white/85">
                            {generatedLink}
                          </code>
                          <button
                            type="button"
                            onClick={() => copy(generatedLink, "gen")}
                            className={cn(QUIET_BTN, "shrink-0")}
                          >
                            {copied === "gen" ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </GlassPanel>

                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-4">
                  <p className={LABEL}>How links work</p>
                  <ol className="mt-3 flex flex-1 flex-col gap-3.5">
                    <li>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
                        1 · Code
                      </p>
                      <code className="mt-1.5 block font-mono text-[12px] text-white/88">
                        /r/bonus50
                      </code>
                      <p className="mt-1 text-[12px] leading-snug text-white/55">
                        Main link. Totals live on this row.
                      </p>
                    </li>
                    <li>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
                        2 · Creative
                      </p>
                      <code className="mt-1.5 block font-mono text-[12px] text-white/88">
                        /r/bonus50/stories-1
                      </code>
                      <p className="mt-1 text-[12px] leading-snug text-white/55">
                        Same code, tagged traffic — extra row when it has clicks.
                      </p>
                    </li>
                    <li className="mt-auto border-t border-white/[0.08] pt-3">
                      <p className="text-[11px] leading-snug text-white/45">
                        Fee vol = estimated entry-fee volume for payouts.
                      </p>
                    </li>
                  </ol>
                </GlassPanel>
              </div>

              <GlassPanel matte className="!rounded-xl px-4 py-5 sm:px-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className={LABEL}>Links</p>
                  <button
                    type="button"
                    onClick={() => void loadStats()}
                    disabled={statsLoading}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55 transition hover:text-white disabled:opacity-40"
                  >
                    {statsLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm">
                    <colgroup>
                      <col className={hasCreatives ? "w-[18%]" : "w-[22%]"} />
                      {hasCreatives ? <col className="w-[16%]" /> : null}
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[18%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-white/15">
                        <th className={cn(TH, "pr-3 text-left")}>Code</th>
                        {hasCreatives ? (
                          <th className={cn(TH, "px-2 text-left")}>Creative</th>
                        ) : null}
                        <th className={cn(TH, "px-1 text-center")}>Clicks</th>
                        <th className={cn(TH, "px-1 text-center")}>Signups</th>
                        <th className={cn(TH, "px-1 text-center")}>Fee</th>
                        <th className={cn(TH, "px-1 text-center")}>CR</th>
                        <th className={cn(TH, "pl-2 text-right")}>Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, i) => {
                        const s = row.stat;
                        const isCreo = row.kind === "campaign";
                        return (
                          <motion.tr
                            key={
                              isCreo
                                ? `${s.code}:${(s as CampaignStat).campaign}`
                                : s.code
                            }
                            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className="border-b border-white/[0.06] last:border-0"
                          >
                            <td
                              className={cn(
                                "py-2.5 pr-3 font-mono whitespace-nowrap",
                                isCreo ? "pl-3 text-white/45" : "text-white",
                              )}
                            >
                              {s.code}
                            </td>
                            {hasCreatives ? (
                              <td className="truncate px-2 py-2.5 text-white/80">
                                {isCreo ? (s as CampaignStat).campaign : "—"}
                              </td>
                            ) : null}
                            <td className="px-1 py-2.5 text-center tabular-nums text-white/85">
                              {s.clicks}
                            </td>
                            <td className="px-1 py-2.5 text-center font-semibold tabular-nums text-white">
                              {s.signups}
                            </td>
                            <td className="px-1 py-2.5 text-center tabular-nums text-white/85">
                              {fmtFee(s.estimatedFeeVolumeUsdc)}
                            </td>
                            <td className="px-1 py-2.5 text-center tabular-nums text-white/85">
                              {pct(s.conversionRate)}
                            </td>
                            <td className="whitespace-nowrap py-2.5 pl-2 text-right text-white/55">
                              {fmtDate(s.lastActivity)}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>
            </div>
          </>
        ) : null}

        {!booting && !me?.authenticated ? (
          <main className="mx-auto max-w-lg py-20 text-center opacity-40">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              FORM8 Partners
            </p>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight">
              Partners cabinet
            </h1>
          </main>
        ) : null}
      </div>
    </div>
  );
}
