"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { PartnerLoginModal } from "@/components/partners/PartnerLoginModal";
import { SeasonPageWash } from "@/components/season/seasonPageChrome";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import {
  buildReferralLink,
  buildShortReferralLink,
  normalizeRefCode,
} from "@/lib/referralClient";
import { cn } from "@/lib/utils";

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
  email?: string;
  partner?: { id: string; label: string; codes: string[] };
  googleConfigured: boolean;
  devLoginAllowed: boolean;
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
};

const ERR_COPY: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured yet — use your invite link.",
  not_allowed: "This Google account is not on the partner whitelist.",
  email_unverified: "Verify your Google email, then try again.",
  oauth_failed: "Sign-in failed. Try again.",
  bad_state: "Login session expired. Try again.",
  missing_code: "Google did not return a code. Try again.",
  magic_invalid: "Invite link is invalid or expired. Ask for a new one.",
  rate_limited: "Too many attempts. Wait a minute.",
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

export function PartnerCabinetShell() {
  const reduceMotion = useReducedMotion();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [booting, setBooting] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState("");
  const [selectedCode, setSelectedCode] = useState("");

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const err = params.get("err");
        if (err) {
          setError(ERR_COPY[err] ?? `Sign-in error: ${err}`);
          window.history.replaceState({}, "", "/partners");
        }
        const body = await loadMe();
        if (cancelled) return;
        if (body.authenticated) await loadStats();
      } catch {
        if (!cancelled) setError("Could not check session.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, loadStats]);

  const generatedLink = useMemo(() => {
    const code = normalizeRefCode(selectedCode);
    if (!code) return "";
    return buildShortReferralLink(BASE_URL, code, newCampaign.trim() || null);
  }, [selectedCode, newCampaign]);

  const generatedClassic = useMemo(() => {
    const code = normalizeRefCode(selectedCode);
    if (!code) return "";
    return buildReferralLink(BASE_URL, code, newCampaign.trim() || null);
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
    setMe({
      authenticated: false,
      googleConfigured: me?.googleConfigured ?? false,
      devLoginAllowed: me?.devLoginAllowed ?? false,
    });
    setData(null);
  }, [me]);

  const devLogin = useCallback(
    async (email: string) => {
      setError(null);
      const res = await fetch("/api/partners/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Login failed");
        return;
      }
      const body = await loadMe();
      if (body.authenticated) await loadStats();
    },
    [loadMe, loadStats],
  );

  const authed = !!me?.authenticated && !!data;

  return (
    <div className="relative min-h-screen bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      <PartnerLoginModal
        open={!booting && !me?.authenticated}
        googleConfigured={!!me?.googleConfigured}
        error={error}
        devLoginAllowed={!!me?.devLoginAllowed}
        onDevLogin={devLogin}
      />

      <div className={cn("relative mx-auto max-w-7xl px-5 sm:px-8", PRODUCT_PAGE_TOP, "pb-16")}>
        {booting ? (
          <p className="py-12 text-sm text-white/35">Loading…</p>
        ) : null}

        {authed ? (
          <>
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  Partner · {data.partner.label}
                </p>
                <h1 className="mt-0.5 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-[2rem]">
                  Cabinet
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
                  Your referral links, clicks, and registrations. Only your codes.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="text-[11px] text-white/40">{me.email}</p>
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

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
              <div className="flex min-w-0 flex-col gap-5">
                <GlassPanel matte className="!rounded-xl px-4 py-5 sm:px-5 sm:py-6">
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
                      <p className="mt-1 font-display text-2xl font-black tabular-nums text-white/90">
                        ~{Number(data.totals.estimatedFeeVolumeUsdc ?? 0).toFixed(1)}
                      </p>
                    </div>
                  </div>
                  {!data.durable ? (
                    <p className="mt-4 text-[11px] text-amber-200/70">
                      Storage is in-memory or Redis unreachable — numbers may reset.
                    </p>
                  ) : null}
                </GlassPanel>

                <GlassPanel matte className="!rounded-xl px-4 py-5 sm:px-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Link generator
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedCode}
                      onChange={(e) => setSelectedCode(e.target.value)}
                      className="rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-white/28 focus:outline-none sm:w-40"
                    >
                      {(data.partner.codes.length
                        ? data.partner.codes
                        : me.partner?.codes ?? []
                      ).map((c) => (
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
                  {generatedLink ? (
                    <div className="mt-3 space-y-2">
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
                      {generatedClassic ? (
                        <p className="break-all text-[11px] text-white/28">
                          classic · <span className="text-white/45">{generatedClassic}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-3 text-[11px] leading-relaxed text-white/32">
                    Short links{" "}
                    <code className="text-white/50">/r/code</code> and{" "}
                    <code className="text-white/50">/r/code/campaign</code>. Campaigns appear
                    after the first click — no pre-registration.
                  </p>
                </GlassPanel>

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
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-white/35">
                          <th className="py-2 pr-3 font-medium">Code</th>
                          <th className="px-3 py-2 text-right font-medium">Clicks</th>
                          <th className="px-3 py-2 text-right font-medium">Signups</th>
                          <th className="px-3 py-2 text-right font-medium">Fee</th>
                          <th className="px-3 py-2 text-right font-medium">CR</th>
                          <th className="py-2 pl-3 text-right font-medium">Last</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.codes.map((s, i) => (
                          <motion.tr
                            key={s.code}
                            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.25 }}
                            className="border-b border-white/[0.05] last:border-0"
                          >
                            <td className="py-2.5 pr-3 font-mono text-[#00f948]">{s.code}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-white/75">
                              {s.clicks}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-white">
                              {s.signups}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300/85">
                              ~{Number(s.estimatedFeeVolumeUsdc ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-white/75">
                              {pct(s.conversionRate)}
                            </td>
                            <td className="py-2.5 pl-3 text-right text-white/35">
                              {fmtDate(s.lastActivity)}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(data.campaigns?.length ?? 0) > 0 ? (
                    <div className="mt-8">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                        Campaigns
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-white/35">
                              <th className="py-2 pr-3 font-medium">Code</th>
                              <th className="px-3 py-2 font-medium">Campaign</th>
                              <th className="px-3 py-2 text-right font-medium">Clicks</th>
                              <th className="px-3 py-2 text-right font-medium">Signups</th>
                              <th className="py-2 pl-3 text-right font-medium">CR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.campaigns!.map((s) => (
                              <tr
                                key={`${s.code}:${s.campaign}`}
                                className="border-b border-white/[0.05] last:border-0"
                              >
                                <td className="py-2.5 pr-3 font-mono text-emerald-300/80">
                                  {s.code}
                                </td>
                                <td className="px-3 py-2.5 text-white/80">{s.campaign}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-white/75">
                                  {s.clicks}
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-white">
                                  {s.signups}
                                </td>
                                <td className="py-2.5 pl-3 text-right tabular-nums text-white/75">
                                  {pct(s.conversionRate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </GlassPanel>
              </div>

              <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
                <GlassPanel matte className="!rounded-xl px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Your codes
                  </p>
                  <ul className="mt-3 space-y-2">
                    {data.partner.codes.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          onClick={() => copy(buildShortReferralLink(BASE_URL, c), `code-${c}`)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left transition hover:border-white/20"
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
                <GlassPanel matte className="!rounded-xl px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Note
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                    Partner refs do not award Season Points. Fee volume is an estimate for
                    manual commission.
                  </p>
                </GlassPanel>
              </aside>
            </div>
          </>
        ) : null}

        {!booting && !me?.authenticated ? (
          <main className="mx-auto max-w-lg py-20 text-center opacity-40">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              FORM8 Partners
            </p>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight">
              Cabinet
            </h1>
          </main>
        ) : null}
      </div>
    </div>
  );
}
