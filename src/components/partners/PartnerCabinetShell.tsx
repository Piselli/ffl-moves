"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { PartnerLoginModal } from "@/components/partners/PartnerLoginModal";
import { REGISTER_CTA_CLASS } from "@/components/season/seasonActionShared";
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
const SIDE_GRID = "grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-5";

const LABEL =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-white/65";
const TH =
  "py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70";
const QUIET_BTN =
  "rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/80 transition-[border-color,background-color,color,transform] duration-150 hover:border-white/28 hover:bg-white/[0.1] hover:text-white active:scale-[0.97] disabled:opacity-40";
const FIELD =
  "min-w-0 rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/28 focus:outline-none";

type StatTableRow =
  | { kind: "code"; stat: ReferralStat }
  | { kind: "campaign"; stat: CampaignStat };

export function PartnerCabinetShell() {
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
      setError("Connect a whitelisted wallet and sign.");
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
        setError(`Could not load stats (${res.status}).`);
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

  const secondaryMetrics = data
    ? [
        { label: "Clicks", value: data.totals.clicks.toLocaleString() },
        { label: "CR", value: pct(data.totals.conversionRate) },
        { label: "Fee vol", value: fmtFee(data.totals.estimatedFeeVolumeUsdc) },
        { label: "Wallets", value: conversionCount.toLocaleString() },
      ]
    : [];

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
        {booting ? <p className="py-12 text-sm text-white/55">Loading…</p> : null}

        {authed ? (
          <>
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className={LABEL}>Partner · {data.partner.label}</p>
                <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-[2rem]">
                  Partners cabinet
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-mono text-[12px] text-white/55">
                  {shortenAddress(me.wallet ?? "")}
                </p>
                <button type="button" onClick={() => void logout()} className={QUIET_BTN}>
                  Sign out
                </button>
              </div>
            </header>

            {error && me.authenticated ? (
              <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100/90">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-4 lg:gap-5">
              {/* Stats + Your codes */}
              <div className={SIDE_GRID}>
                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-5 sm:px-5 sm:py-6">
                  <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-5 sm:gap-x-6">
                    <div className="col-span-2 sm:col-span-1">
                      <p className={LABEL}>Registrations</p>
                      <p className="mt-1.5 font-display text-4xl font-black tabular-nums leading-none tracking-tight text-[#00f948] sm:text-[2.75rem]">
                        {data.totals.signups.toLocaleString()}
                      </p>
                    </div>
                    {secondaryMetrics.map((m) => (
                      <div key={m.label}>
                        <p className={LABEL}>{m.label}</p>
                        <p className="mt-1.5 font-display text-[1.75rem] font-black tabular-nums leading-none text-white sm:text-[2rem]">
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!data.durable ? (
                    <p className="mt-4 text-[11px] text-amber-200/80">
                      Storage unreachable — numbers may reset.
                    </p>
                  ) : null}
                </GlassPanel>

                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-4">
                  <p className={LABEL}>Your codes</p>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {data.partner.codes.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCode(c);
                            copy(buildShortReferralLink(BASE_URL, c), `code-${c}`);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-[border-color,background-color] duration-150",
                            selectedCode === c
                              ? "border-white/30 bg-white/[0.08]"
                              : "border-white/12 bg-black/25 hover:border-white/22",
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

              {/* Create link + How links work */}
              <div className={SIDE_GRID}>
                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-5 sm:px-5">
                  <p className={LABEL}>Create link</p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-white/70">New code</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value)}
                          placeholder="bonus50-tg"
                          className={cn(FIELD, "flex-1")}
                        />
                        <button
                          type="button"
                          disabled={creating || !newCode.trim()}
                          onClick={() => void createCode()}
                          className={cn(REGISTER_CTA_CLASS, "shrink-0 disabled:opacity-40")}
                        >
                          {creating ? "Creating…" : "Create code"}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.08] pt-4">
                      <p className="mb-1.5 text-[12px] font-medium text-white/70">Creative</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          value={selectedCode}
                          onChange={(e) => setSelectedCode(e.target.value)}
                          className={cn(FIELD, "sm:w-40")}
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
                          placeholder="stories-1"
                          className={cn(FIELD, "flex-1")}
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
                  <div className="mt-3 flex flex-1 flex-col gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
                        Code
                      </p>
                      <code className="mt-1.5 block font-mono text-[12px] text-white/90">
                        /r/bonus50
                      </code>
                      <p className="mt-1 text-[12px] leading-snug text-white/55">Main totals</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
                        Creative
                      </p>
                      <code className="mt-1.5 block font-mono text-[12px] text-white/90">
                        /r/bonus50/stories-1
                      </code>
                      <p className="mt-1 text-[12px] leading-snug text-white/55">
                        Tagged traffic under the code
                      </p>
                    </div>
                    <p className="mt-auto border-t border-white/[0.08] pt-3 text-[11px] leading-snug text-white/45">
                      Fee vol · estimated entry fees for payouts
                    </p>
                  </div>
                </GlassPanel>
              </div>

              <GlassPanel matte className="!rounded-xl px-4 py-5 sm:px-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className={LABEL}>Links</p>
                  <button
                    type="button"
                    onClick={() => void loadStats()}
                    disabled={statsLoading}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55 transition-colors duration-150 hover:text-white disabled:opacity-40"
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
                      {tableRows.map((row) => {
                        const s = row.stat;
                        const isCreo = row.kind === "campaign";
                        return (
                          <tr
                            key={
                              isCreo
                                ? `${s.code}:${(s as CampaignStat).campaign}`
                                : s.code
                            }
                            className="border-b border-white/[0.06] last:border-0"
                          >
                            <td
                              className={cn(
                                "whitespace-nowrap py-2.5 pr-3 font-mono",
                                isCreo ? "pl-3 text-white/40" : "text-white",
                              )}
                            >
                              {isCreo ? "" : s.code}
                            </td>
                            {hasCreatives ? (
                              <td className="truncate px-2 py-2.5 text-white/85">
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
