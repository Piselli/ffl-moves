"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildReferralLink, normalizeRefCode } from "@/lib/referralClient";

type ReferralStat = {
  code: string;
  clicks: number;
  signups: number;
  conversionRate: number;
  firstSeen: number | null;
  lastActivity: number | null;
};

type StatsResponse = {
  durable: boolean;
  health?: { configured: boolean; reachable: boolean; error: string | null };
  totals: { clicks: number; signups: number; conversionRate: number };
  codes: ReferralStat[];
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

  // Link generator
  const [baseUrl, setBaseUrl] = useState("");
  const [newCode, setNewCode] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY_STORAGE);
      if (saved) setKey(saved);
    } catch {
      /* ignore */
    }
    setBaseUrl(window.location.origin);
  }, []);

  const load = useCallback(async (k: string) => {
    if (!k) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/referral/stats?key=${encodeURIComponent(k)}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Невірний ключ доступу.");
        setData(null);
        return;
      }
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Дашборд вимкнено: не задано REFERRAL_ADMIN_KEY.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setError(`Помилка: ${res.status}`);
        setData(null);
        return;
      }
      const body = (await res.json()) as StatsResponse;
      setData(body);
      try {
        localStorage.setItem(KEY_STORAGE, k);
      } catch {
        /* ignore */
      }
    } catch {
      setError("Не вдалося завантажити статистику.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load if a key was remembered.
  useEffect(() => {
    if (key) void load(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generatedLink = useMemo(() => {
    const code = normalizeRefCode(newCode);
    if (!code || !baseUrl) return "";
    return buildReferralLink(baseUrl, code);
  }, [newCode, baseUrl]);

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
    <div className="max-w-5xl mx-auto px-4 pt-28 pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-black uppercase tracking-tight text-white">
          Referrals
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Реферальні посилання та статистика кліків / реєстрацій.
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
            onKeyDown={(e) => e.key === "Enter" && load(key)}
            placeholder="REFERRAL_ADMIN_KEY"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={() => load(key)}
            disabled={loading || !key}
            className="px-4 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-40 text-black text-sm font-bold transition-colors"
          >
            {loading ? "…" : "Показати"}
          </button>
        </div>
        {error && <p className="text-amber-400 text-sm mt-3">{error}</p>}
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
            placeholder="https://movematch.xyz"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="код (напр. alex)"
            className="sm:w-48 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
        </div>
        {generatedLink && (
          <div className="mt-3 flex items-center gap-2">
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
        )}
        <p className="text-white/30 text-xs mt-2">
          Дозволені символи: латиниця, цифри, «-» та «_». Атрибуція — за першим кліком (first-touch), cookie живе 30 днів.
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
                    <th className="py-2 px-4 font-medium text-right">CR</th>
                    <th className="py-2 px-4 font-medium text-right">Перший</th>
                    <th className="py-2 pl-4 font-medium text-right">Останній</th>
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
                      <td className="py-2.5 px-4 text-right text-white/80">{pct(s.conversionRate)}</td>
                      <td className="py-2.5 px-4 text-right text-white/40">{fmtDate(s.firstSeen)}</td>
                      <td className="py-2.5 pl-4 text-right text-white/40">{fmtDate(s.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  );
}
