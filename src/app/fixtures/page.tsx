"use client";

import { useEffect, useState } from "react";
import { resolveFplDeadlineRaw, formatFplDeadlineLocale } from "@/lib/fpl-deadline";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { SeasonPageWash } from "@/components/season/seasonPageChrome";
import {
  FplFixturesBoard,
  type FplFixturesPayload,
} from "@/components/FplFixturesBoard";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { getConfig, findOpenGameweek } from "@/lib/chainClient";

export default function FixturesPage() {
  const { locale } = useSiteLocale();
  const fx = useSiteMessages().pages.fixtures;
  const [data, setData] = useState<FplFixturesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [registrationGwId, setRegistrationGwId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getConfig();
        const gw = cfg ? await findOpenGameweek() : null;
        if (!cancelled && gw?.id != null && Number.isFinite(gw.id)) setRegistrationGwId(gw.id);
      } catch {
        /* keep null — API falls back to FPL-only pick */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs =
      registrationGwId != null && registrationGwId >= 1 ? `?registrationGw=${registrationGwId}` : "";
    fetch(`/api/fixtures${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [registrationGwId]);

  const totalMatches = data?.fixtures.length ?? 0;
  const finishedCount = data?.fixtures.filter((f) => f.finished).length ?? 0;
  const liveCount = data?.fixtures.filter((f) => f.started && !f.finished).length ?? 0;
  const deadlineRaw = data ? resolveFplDeadlineRaw(data.gameweek) : null;

  const metaBits: string[] = [];
  if (data && totalMatches > 0) metaBits.push(fx.progressDone(finishedCount, totalMatches));
  if (liveCount > 0) metaBits.push(fx.liveMatches(liveCount));

  return (
    <div className="relative min-h-screen bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      <main className="relative mx-auto max-w-4xl px-5 pb-16 pt-20 sm:px-8 md:pt-24">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div className="min-w-0">
            {data?.gameweek.name ? (
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {data.gameweek.name}
              </p>
            ) : null}
            <h1 className="mt-0.5 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              {fx.title}
            </h1>
            {metaBits.length > 0 ? (
              <p className="mt-1.5 text-[11px] text-white/35">{metaBits.join(" · ")}</p>
            ) : null}
          </div>

          {deadlineRaw != null && deadlineRaw !== "" ? (
            <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                {fx.deadlineLabel}
              </p>
              <p className="mt-1 font-display text-base font-black tabular-nums text-white sm:text-lg">
                {formatFplDeadlineLocale(deadlineRaw, locale === "uk" ? "uk" : "en")}
              </p>
            </div>
          ) : null}
        </header>

        <FplFixturesBoard
          data={data}
          locale={locale}
          fx={fx}
          loading={loading}
          error={error}
        />
      </main>
    </div>
  );
}
