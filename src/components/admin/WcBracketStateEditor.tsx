"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WcBracketPredictor } from "@/components/wc/WcBracketPredictor";
import { emptyBracketPrediction, type BracketPrediction } from "@/lib/wcBracketPrediction";
import type { WcBracketState } from "@/lib/wcBracketState";
import { cn } from "@/lib/utils";

const KEY_STORAGE = "wc_bracket_state_admin_key";

type Props = {
  copy: {
    title: string;
    hint: string;
    autoSyncOn: string;
    autoSyncOff: string;
    overrideTitle: string;
    overrideHint: string;
    adminKeyLabel: string;
    adminKeyPlaceholder: string;
    refreshButton: string;
    saveButton: string;
    saving: string;
    lastUpdated: (iso: string, source: string) => string;
    saveSuccess: string;
    saveError: string;
    keyRequired: string;
    predictor: Parameters<typeof WcBracketPredictor>[0]["copy"];
    final: string;
    thirdPlace: string;
    tapHint: string;
  };
};

export function WcBracketStateEditor({ copy }: Props) {
  const [live, setLive] = useState<WcBracketState | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [prediction, setPrediction] = useState<BracketPrediction>(() => emptyBracketPrediction());
  const [step, setStep] = useState<"groups" | "thirds" | "knockout">("groups");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    if (saved) setAdminKey(saved);
  }, []);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
    }),
    [adminKey],
  );

  const refreshLive = useCallback(async () => {
    try {
      const res = await fetch("/api/wc-bracket-state", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as WcBracketState;
      setLive(data);
      if (!overrideOpen) {
        setPrediction({
          groupRanks: data.groupRanks,
          thirdPlaceOrder: data.thirdPlaceOrder,
          knockoutWinners: data.knockoutWinners,
        });
      }
    } catch {
      // keep last
    } finally {
      setLoading(false);
    }
  }, [overrideOpen]);

  useEffect(() => {
    void refreshLive();
    const id = window.setInterval(() => void refreshLive(), 30_000);
    return () => window.clearInterval(id);
  }, [refreshLive]);

  const autoSync = live?.meta?.source === "api" || live?.meta?.source === "mixed" || live?.meta?.source === "static";

  const handleSaveOverride = async () => {
    if (!adminKey) {
      setError(copy.keyRequired);
      return;
    }
    sessionStorage.setItem(KEY_STORAGE, adminKey);
    setSaving(true);
    setError(null);
    try {
      const payload: WcBracketState = {
        ...prediction,
        meta: { updatedAt: null, source: "manual" },
      };
      const res = await fetch("/api/wc-bracket-state", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? copy.saveError);

      setStatus(copy.saveSuccess);
      setOverrideOpen(false);
      await refreshLive();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const predictorCopy = useMemo(
    () => ({
      ...copy.predictor,
      final: copy.final,
      thirdPlace: copy.thirdPlace,
      tapHint: copy.tapHint,
    }),
    [copy],
  );

  const preview = overrideOpen ? prediction : live ?? prediction;

  return (
    <div className="glass-card rounded-2xl border border-[#00f948]/20 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{copy.title}</h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{copy.hint}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
            autoSync
              ? "border-[#00f948]/30 bg-[#00f948]/10 text-[#00f948]"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200",
          )}
        >
          {autoSync ? copy.autoSyncOn : copy.autoSyncOff}
        </span>
      </div>

      {live?.meta?.updatedAt ? (
        <p className="mb-3 text-xs text-white/45">
          {copy.lastUpdated(live.meta.updatedAt, live.meta.source ?? "api")}
        </p>
      ) : null}
      {status ? <p className="mb-3 text-xs text-[#00f948]/80">{status}</p> : null}
      {error ? <p className="mb-3 text-xs text-rose-300">{error}</p> : null}

      <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 sm:p-4">
        <WcBracketPredictor
          value={preview}
          onChange={overrideOpen ? setPrediction : () => {}}
          readOnly={!overrideOpen}
          step={step}
          onStepChange={setStep}
          groupsLocked
          thirdsLocked
          copy={predictorCopy}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refreshLive()}
          disabled={loading}
          className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/70 disabled:opacity-40"
        >
          {loading ? "…" : copy.refreshButton}
        </button>
        <button
          type="button"
          onClick={() => {
            setOverrideOpen((v) => !v);
            if (!overrideOpen && live) {
              setPrediction({
                groupRanks: live.groupRanks,
                thirdPlaceOrder: live.thirdPlaceOrder,
                knockoutWinners: live.knockoutWinners,
              });
            }
          }}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-100"
        >
          {overrideOpen ? copy.refreshButton : copy.overrideTitle}
        </button>
      </div>

      {overrideOpen ? (
        <div className="mt-4 space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-xs text-amber-100/80">{copy.overrideHint}</p>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">{copy.adminKeyLabel}</span>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder={copy.adminKeyPlaceholder}
              className="rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleSaveOverride()}
            disabled={saving || !adminKey}
            className="rounded-lg bg-[#00f948] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-black disabled:opacity-40"
          >
            {saving ? copy.saving : copy.saveButton}
          </button>
        </div>
      ) : null}
    </div>
  );
}
