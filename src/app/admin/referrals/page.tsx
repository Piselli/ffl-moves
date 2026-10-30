"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SitePageShell } from "@/components/SitePageShell";
import {
  buildReferralLink,
  buildShortReferralLink,
  normalizeRefCode,
} from "@/lib/referralClient";

type ReferralStat = {
  code: string;
  clicks: number;
  signups: number;
  conversionRate: number;
  firstSeen: number | null;
  lastActivity: number | null;
  estimatedFeeVolumeUsdc: number;
};

type CampaignStat = ReferralStat & { campaign: string };

type StatsResponse = {
  durable: boolean;
  health?: { configured: boolean; reachable: boolean; error: string | null };
  totals: {
    clicks: number;
    signups: number;
    conversionRate: number;
    estimatedFeeVolumeUsdc: number;
  };
  codes: ReferralStat[];
  campaigns?: CampaignStat[];
  /** Note: partner refs do not award Season Points — fee share is manual. */
  note?: string;
};

const KEY_STORAGE = "fflmove_ref_admin_key";

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

export default function ReferralDashboardPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Link generator
  const [baseUrl, setBaseUrl] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCampaign, setNewCampaign] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async (k: string) => {
    const trimmed = k.trim();
    if (!trimmed) {
      setError("Встав ключ доступу і натисни «Увійти».");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/referral/stats?key=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Невірний ключ. Очисти поле і встав актуальний REFERRAL_ADMIN_KEY з .env.local.");
        setData(null);
        try {
          localStorage.removeItem(KEY_STORAGE);
        } catch {
          /* ignore */
        }
        return;
      }
      if (res.status === 429) {
        setError("Забагато спроб. Зачекай хвилину і спробуй знову.");
        setData(null);
        return;
      }
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Дашборд вимкнено: не задано REFERRAL_ADMIN_KEY на сервері.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setError(`Помилка сервера: ${res.status}`);
        setData(null);
        return;
      }
      const body = (await res.json()) as StatsResponse;
      setData(body);
      setKey(trimmed);
      try {
        localStorage.setItem(KEY_STORAGE, trimmed);
      } catch {
        /* ignore */
      }
    } catch {
      setError("Не вдалося завантажити статистику. Перевір, що npm run dev запущений.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
    // Partner links should always point at production, even when viewing stats on localhost.
    setBaseUrl("https://form8.football");
    if (saved) {
      setKey(saved);
      void load(saved);
    }
    setReady(true);
  }, [load]);

  const generatedLink = useMemo(() => {
    const code = normalizeRefCode(newCode);
    if (!code || !baseUrl) return "";
    return buildShortReferralLink(baseUrl, code, newCampaign.trim() || null);
  }, [newCode, newCampaign, baseUrl]);

  const generatedClassic = useMemo(() => {
    const code = normalizeRefCode(newCode);
    if (!code || !baseUrl) return "";
    return buildReferralLink(baseUrl, code, newCampaign.trim() || null);
  }, [newCode, newCampaign, baseUrl]);

  const removeCode = useCallback(
    async (code: string) => {
      if (!key) return;
      if (!window.confirm(`Видалити код «${code}» зі статистики? Цю дію не можна скасувати.`)) return;
      setDeleting(code);
      setError(null);
      try {
        const res = await fetch(
          `/api/referral/stats?key=${encodeURIComponent(key)}&code=${encodeURIComponent(code)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `Не вдалося видалити (${res.status})`);
          return;
        }
        await load(key);
      } catch {
        setError("Не вдалося видалити код.");
      } finally {
        setDeleting(null);
      }
    },
    [key, load],
  );

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SitePageShell width="xl">
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-display font-black uppercase tracking-tight text-white">
          Referrals
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Partner <code className="text-white/55">?ref=</code> links — clicks / registrations /
          estimated fee volume for manual commission. No Season Points.
        </p>
        <p className="text-white/30 text-xs mt-2">
          Player invites use <code className="text-white/45">?inv=</code> and award SP separately.{" "}
          <a href="/admin/auth" className="text-emerald-400/70 hover:text-emerald-400">
            Auth & connects →
          </a>
        </p>
      </header>

      {/* Access key */}
      <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 mb-6">
        <label className="block text-xs uppercase tracking-wide text-white/40 mb-2">
          Ключ доступу
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(key);
            }}
            placeholder="REFERRAL_ADMIN_KEY з .env.local"
            autoComplete="off"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={() => void load(key)}
            disabled={loading || !key.trim() || !ready}
            className="px-4 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-40 text-black text-sm font-bold transition-colors"
          >
            {loading ? "Завантаження…" : "Увійти"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
            {error}
          </p>
        ) : null}
        {data ? (
          <p className="mt-3 text-sm text-emerald-300/90">
            ✓ Увійшов. Redis: {data.durable ? "зберігає статистику" : "in-memory (нестійко)"}.
          </p>
        ) : (
          <p className="mt-3 text-xs text-white/35">
            Встав ключ і натисни <b className="text-white/55">Увійти</b> — з’явиться таблиця кліків і реєстрацій.
          </p>
        )}
      </section>

      {/* Link generator */}
      <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/70 mb-3">
          Генератор посилань
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://form8.football"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="код партнера (напр. acme)"
            className="sm:w-44 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <input
            value={newCampaign}
            onChange={(e) => setNewCampaign(e.target.value)}
            placeholder="кампанія (creo1, stories…)"
            className="sm:w-52 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
        </div>
        {generatedLink && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-emerald-300 bg-black/40 border border-white/10 rounded-lg px-3 py-2 break-all">
                {generatedLink}
              </code>
              <button
                onClick={() => copy(generatedLink, "gen")}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                {copied === "gen" ? "Скопійовано" : "Копіювати"}
              </button>
            </div>
            {generatedClassic ? (
              <p className="text-[11px] text-white/30 break-all">
                classic: <span className="text-white/45">{generatedClassic}</span>
              </p>
            ) : null}
          </div>
        )}
        <p className="text-white/30 text-xs mt-2">
          Для вебмайстра — короткі лінки <code className="text-white/45">/r/код</code> і{" "}
          <code className="text-white/45">/r/код/кампанія</code>. Кліки по креативу; реєстрація —
          first-touch. Cookie 30 днів.
        </p>
      </section>

      {/* Partner Google Sheets */}
      <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/70 mb-2">
          Google Sheets для партнера
        </h2>
        <p className="text-white/45 text-sm mb-3">
          Партнер бачить лише свої коди (окремий ключ, не admin). Раз на годину Apps Script тягне{" "}
          <code className="text-white/60">/api/referral/partner</code> у таблицю: Summary + Conversions.
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-white/55 mb-3">
          <li>
            У Vercel додай{" "}
            <code className="text-emerald-300/80">REFERRAL_PARTNERS</code> (JSON з id, key, codes,
            emails) і задеплой. Кабінет:{" "}
            <code className="text-white/70">/partners</code>.
          </li>
          <li>Створи Google Sheet → Extensions → Apps Script → встав скрипт з репо.</li>
          <li>
            Script property <code className="text-white/70">PARTNER_KEY</code> = ключ партнера → Run{" "}
            <code className="text-white/70">syncPartnerStats</code> →{" "}
            <code className="text-white/70">installHourlyTrigger</code>.
          </li>
        </ol>
        <pre className="overflow-x-auto rounded-lg bg-black/50 border border-white/10 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-200/90 mb-3">
{`REFERRAL_PARTNERS='[{"id":"acme","label":"Acme","key":"<secret>","codes":["acme"],"emails":["partner@gmail.com"]}]'`}
        </pre>
        <p className="text-white/30 text-xs">
          Інструкція + скрипт:{" "}
          <code className="text-white/45">docs/partner-referral-sheets.md</code>,{" "}
          <code className="text-white/45">docs/partner-sheets-apps-script.js</code>
        </p>
      </section>

      {/* Stats */}
      {data && (
        <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">
              Статистика
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/50">
                Кліки: <span className="text-white font-bold">{data.totals.clicks}</span>
              </span>
              <span className="text-white/50">
                Реєстрації: <span className="text-white font-bold">{data.totals.signups}</span>
              </span>
              <span className="text-white/50">
                CR: <span className="text-white font-bold">{pct(data.totals.conversionRate)}</span>
              </span>
              <span className="text-white/50">
                Fee vol:{" "}
                <span className="text-white font-bold">
                  ~{Number(data.totals.estimatedFeeVolumeUsdc ?? 0).toFixed(2)} USDC
                </span>
              </span>
            </div>
          </div>

          {!data.durable && (
            <div className="text-amber-400/90 text-xs mb-4 space-y-1">
              {data.health?.configured && !data.health?.reachable ? (
                <>
                  <p>
                    ⚠ Upstash налаштований, але <b>недоступний</b> — дані пишуться в in-memory (нестійко).
                  </p>
                  {data.health?.error && (
                    <p className="text-amber-300/70">
                      Помилка Redis: <code className="break-all">{data.health.error}</code>
                    </p>
                  )}
                  <p className="text-white/40">
                    Перевір, що в <code>UPSTASH_REDIS_REST_URL</code> саме REST-адреса (<code>https://…upstash.io</code>),
                    а в <code>UPSTASH_REDIS_REST_TOKEN</code> — REST-токен (не <code>rediss://…</code>).
                  </p>
                </>
              ) : (
                <p>
                  ⚠ Зберігання in-memory (дані скидаються при перезапуску). Для проду задайте
                  <code className="mx-1">UPSTASH_REDIS_REST_URL</code> та
                  <code className="mx-1">UPSTASH_REDIS_REST_TOKEN</code>.
                </p>
              )}
            </div>
          )}

          {data.codes.length === 0 ? (
            <p className="text-white/40 text-sm py-6 text-center">Поки що немає даних.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 border-b border-white/10">
                    <th className="py-2 pr-4 font-medium">Код</th>
                    <th className="py-2 px-4 font-medium text-right">Кліки</th>
                    <th className="py-2 px-4 font-medium text-right">Реєстрації</th>
                    <th className="py-2 px-4 font-medium text-right">Fee vol</th>
                    <th className="py-2 px-4 font-medium text-right">CR</th>
                    <th className="py-2 px-4 font-medium text-right">Перший</th>
                    <th className="py-2 pl-4 font-medium text-right">Останній</th>
                    <th className="py-2 pl-2 font-medium text-right w-10" aria-label="Дії" />
                  </tr>
                </thead>
                <tbody>
                  {data.codes.map((s) => (
                    <tr key={s.code} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-mono text-emerald-300">{s.code}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-white/80">{s.clicks}</td>
                      <td className="py-2.5 px-4 text-right text-white font-semibold">{s.signups}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-300/90 tabular-nums">
                        ~{Number(s.estimatedFeeVolumeUsdc ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-white/80">{pct(s.conversionRate)}</td>
                      <td className="py-2.5 px-4 text-right text-white/40">{fmtDate(s.firstSeen)}</td>
                      <td className="py-2.5 pl-4 text-right text-white/40">{fmtDate(s.lastActivity)}</td>
                      <td className="py-2.5 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeCode(s.code)}
                          disabled={deleting === s.code}
                          title="Видалити зі статистики"
                          className="text-white/25 hover:text-rose-400 disabled:opacity-40 transition-colors text-sm leading-none"
                        >
                          {deleting === s.code ? "…" : "×"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(data.campaigns?.length ?? 0) > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/50 mb-3">
                Кампанії (`?c=`)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/10">
                      <th className="py-2 pr-4 font-medium">Код</th>
                      <th className="py-2 px-4 font-medium">Кампанія</th>
                      <th className="py-2 px-4 font-medium text-right">Кліки</th>
                      <th className="py-2 px-4 font-medium text-right">Реєстрації</th>
                      <th className="py-2 pl-4 font-medium text-right">CR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns!.map((s) => (
                      <tr
                        key={`${s.code}:${s.campaign || "_"}`}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="py-2.5 pr-4 font-mono text-emerald-300/80">{s.code}</td>
                        <td className="py-2.5 px-4 text-white/80">
                          {s.campaign || "(default)"}
                        </td>
                        <td className="py-2.5 px-4 text-right text-white/80">{s.clicks}</td>
                        <td className="py-2.5 px-4 text-right text-white font-semibold">{s.signups}</td>
                        <td className="py-2.5 pl-4 text-right text-white/80">{pct(s.conversionRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={() => load(key)}
            disabled={loading}
            className="mt-4 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            ↻ Оновити
          </button>
        </section>
      )}
    </div>
    </SitePageShell>
  );
}
