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
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtFee(n: number): string {
  return Number(n ?? 0).toFixed(1);
}

/** Shared fixed cols so Codes + Campaigns line up (Code | Campaign | metrics…). */
const STAT_COLS =
  "grid w-full grid-cols-[minmax(5.5rem,1fr)_minmax(5.5rem,1fr)_3.75rem_4rem_3.25rem_3.75rem_minmax(5.5rem,6.5rem)] gap-x-2 items-center text-sm";

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
              {/* Stats + Your codes — same row, equal height */}
              <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-5 sm:px-5 sm:py-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                        Registrations
                      </p>
                      <p className="mt-1 font-display text-4xl font-black tabular-nums tracking-tight text-[#00f948] sm:text-[2.75rem]">
                        {data.totals.signups.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                        Clicks
                      </p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums">
                        {data.totals.clicks.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                        CR
                      </p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums">
                        {pct(data.totals.conversionRate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                        Fee vol
                      </p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums text-white/90">
                        {fmtFee(data.totals.estimatedFeeVolumeUsdc)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                        Wallets
                      </p>
                      <p className="mt-1 font-display text-3xl font-black tabular-nums">
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Your codes
                  </p>
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
                              ? "border-[#00f948]/35 bg-[#00f948]/10"
                              : "border-white/10 bg-black/30 hover:border-white/20",
                          )}
                        >
                          <span className="font-mono text-sm text-[#00f948]">{c}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                            {copied === `code-${c}` ? "Copied" : "Copy"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </GlassPanel>
              </div>

              {/* Create link + tips */}
              <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-5 sm:px-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Create link
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-white/55">
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
                          className="shrink-0 rounded-xl border border-[#00f948]/35 bg-[#00f948]/15 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#00f948] transition hover:bg-[#00f948]/25 disabled:opacity-40"
                        >
                          {creating ? "Creating…" : "Create code"}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06] pt-4">
                      <p className="mb-1.5 text-[11px] font-semibold text-white/55">
                        Campaign under a code
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
                          placeholder="campaign (creo1, stories…)"
                          className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/28 focus:outline-none"
                        />
                      </div>
                    </div>

                    {generatedLink ? (
                      <div className="border-t border-white/[0.06] pt-4">
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[13px] text-[#00f948]">
                            {generatedLink}
                          </code>
                          <button
                            type="button"
                            onClick={() => copy(generatedLink, "gen")}
                            className="shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/75 transition hover:border-white/30 hover:text-white"
                          >
                            {copied === "gen" ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </GlassPanel>

                <GlassPanel matte className="flex h-full flex-col !rounded-xl px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Tips
                  </p>
                  <ul className="mt-3 flex-1 space-y-3 text-[12px] leading-relaxed text-white/45">
                    <li>
                      <span className="font-semibold text-white/65">Code</span> — main link{" "}
                      <code className="text-white/50">/r/code</code>
                    </li>
                    <li>
                      <span className="font-semibold text-white/65">Campaign</span> — creative
                      under a code{" "}
                      <code className="text-white/50">/r/code/creo1</code>
                    </li>
                    <li>Fee vol is estimated entry-fee volume for manual payouts.</li>
                  </ul>
                </GlassPanel>
              </div>

              <GlassPanel matte className="!rounded-xl px-4 py-5 sm:px-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Codes
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadStats()}
                    disabled={statsLoading}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40 transition hover:text-white/70 disabled:opacity-40"
                  >
                    {statsLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <div
                    className={cn(
                      STAT_COLS,
                      "border-b border-white/10 py-2 text-[10px] uppercase tracking-wider text-white/35",
                    )}
                  >
                    <span className="font-medium">Code</span>
                    <span aria-hidden className="font-medium opacity-0">
                      Campaign
                    </span>
                    <span className="text-right font-medium">Clicks</span>
                    <span className="text-right font-medium">Signups</span>
                    <span className="text-right font-medium">Fee</span>
                    <span className="text-right font-medium">CR</span>
                    <span className="text-right font-medium">Last</span>
                  </div>
                  {data.codes.map((s, i) => (
                    <motion.div
                      key={s.code}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      className={cn(STAT_COLS, "border-b border-white/[0.05] py-2.5 last:border-0")}
                    >
                      <span className="truncate font-mono text-[#00f948]">{s.code}</span>
                      <span aria-hidden />
                      <span className="text-right tabular-nums text-white/75">{s.clicks}</span>
                      <span className="text-right font-semibold tabular-nums text-white">
                        {s.signups}
                      </span>
                      <span className="text-right tabular-nums text-emerald-300/85">
                        {fmtFee(s.estimatedFeeVolumeUsdc)}
                      </span>
                      <span className="text-right tabular-nums text-white/75">
                        {pct(s.conversionRate)}
                      </span>
                      <span className="text-right text-white/35">{fmtDate(s.lastActivity)}</span>
                    </motion.div>
                  ))}
                </div>

                {(data.campaigns?.length ?? 0) > 0 ? (
                  <div className="mt-8">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                      Campaigns
                    </p>
                    <div className="overflow-x-auto">
                      <div
                        className={cn(
                          STAT_COLS,
                          "border-b border-white/10 py-2 text-[10px] uppercase tracking-wider text-white/35",
                        )}
                      >
                        <span className="font-medium">Code</span>
                        <span className="font-medium">Campaign</span>
                        <span className="text-right font-medium">Clicks</span>
                        <span className="text-right font-medium">Signups</span>
                        <span className="text-right font-medium">Fee</span>
                        <span className="text-right font-medium">CR</span>
                        <span className="text-right font-medium">Last</span>
                      </div>
                      {data.campaigns!.map((s) => (
                        <div
                          key={`${s.code}:${s.campaign}`}
                          className={cn(
                            STAT_COLS,
                            "border-b border-white/[0.05] py-2.5 last:border-0",
                          )}
                        >
                          <span className="truncate font-mono text-emerald-300/80">{s.code}</span>
                          <span className="truncate text-white/80">{s.campaign}</span>
                          <span className="text-right tabular-nums text-white/75">{s.clicks}</span>
                          <span className="text-right font-semibold tabular-nums text-white">
                            {s.signups}
                          </span>
                          <span className="text-right tabular-nums text-emerald-300/85">
                            {fmtFee(s.estimatedFeeVolumeUsdc)}
                          </span>
                          <span className="text-right tabular-nums text-white/75">
                            {pct(s.conversionRate)}
                          </span>
                          <span className="text-right text-white/35">
                            {fmtDate(s.lastActivity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
