"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useDeposit } from "@/components/depositContext";
import { useWallet } from "@/hooks/useSolanaWallet";
import {
  buildSolTransfer,
  buildUsdcTransfer,
  getSolBalanceLamports,
  getUsdcBalance,
} from "@/lib/chainClient";
import { ENTRY_FEE_SYMBOL, formatFeeUnits } from "@/lib/entryFee";
import { cn, formatTxError } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type WithdrawAsset = "usdc" | "sol";

type WithdrawModalProps = {
  open: boolean;
  onClose: () => void;
};

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function parseRecipient(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    return new PublicKey(trimmed).toBase58();
  } catch {
    return null;
  }
}

function formatSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol >= 1) return sol.toFixed(4).replace(/\.?0+$/, "") || "0";
  if (sol <= 0) return "0";
  return sol.toFixed(6).replace(/\.?0+$/, "") || "0";
}

/** Exact decimal SOL string → lamports (no float rounding). Max 9 decimals. */
function parseSolToLamports(raw: string): bigint | null {
  const t = raw.replace(",", ".").trim();
  if (!/^\d*\.?\d*$/.test(t) || t === "" || t === ".") return null;
  const [whole = "0", frac = ""] = t.split(".");
  if (frac.length > 9) return null;
  const lamports = BigInt(whole || "0") * BigInt(LAMPORTS_PER_SOL) + BigInt(frac.padEnd(9, "0") || "0");
  return lamports > BigInt(0) ? lamports : null;
}

/** Exact decimal USDC string → raw micro-USDC (6 decimals, no float rounding). */
function parseUsdcToRaw(raw: string): bigint | null {
  const t = raw.replace(",", ".").trim();
  if (!/^\d*\.?\d*$/.test(t) || t === "" || t === ".") return null;
  const [whole = "0", frac = ""] = t.split(".");
  if (frac.length > 6) return null;
  const value = BigInt(whole || "0") * BigInt(1_000_000) + BigInt(frac.padEnd(6, "0") || "0");
  return value > BigInt(0) ? value : null;
}

function rawUsdcToInput(raw: bigint): string {
  const unit = BigInt(1_000_000);
  const frac = (raw % unit).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${raw / unit}.${frac}` : (raw / unit).toString();
}

/** Exact lamports → decimal SOL string for the amount input (used by "Max"). */
function lamportsToInput(lamports: number): string {
  const l = BigInt(Math.max(0, Math.floor(lamports)));
  const unit = BigInt(LAMPORTS_PER_SOL);
  const whole = l / unit;
  const frac = (l % unit).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const w = useSiteMessages().withdraw;
  const reduce = Boolean(useReducedMotion());
  const { account, connected, signAndSubmit } = useWallet();
  const { balanceLabel, refreshBalance } = useDeposit();
  const address = account?.address ?? null;
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [asset, setAsset] = useState<WithdrawAsset>("usdc");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [solBalanceLamports, setSolBalanceLamports] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const symbol = asset === "usdc" ? ENTRY_FEE_SYMBOL : "SOL";
  const displayBalance =
    asset === "usdc"
      ? connected
        ? balanceLabel ?? "—"
        : "—"
      : connected && solBalanceLamports !== null
        ? formatSol(solBalanceLamports)
        : "—";

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const refreshSol = useCallback(async () => {
    if (!address) {
      setSolBalanceLamports(null);
      return;
    }
    try {
      setSolBalanceLamports(await getSolBalanceLamports(address));
    } catch {
      setSolBalanceLamports(null);
    }
  }, [address]);

  useEffect(() => {
    if (!open) {
      setAsset("usdc");
      setRecipient("");
      setAmount("");
      setError(null);
      setStatus(null);
      setLoading(false);
      setSolBalanceLamports(null);
      return;
    }
    refreshBalance();
    void refreshSol();
  }, [open, refreshBalance, refreshSol]);

  useEffect(() => {
    setAmount("");
    setError(null);
    setStatus(null);
  }, [asset]);

  const submit = useCallback(async () => {
    setError(null);
    setStatus(null);
    if (!connected || !address) {
      setError(w.needWallet);
      return;
    }
    const to = parseRecipient(recipient);
    if (!to) {
      setError(w.invalidRecipient);
      return;
    }
    if (to === address) {
      setError(w.sameWallet);
      return;
    }
    setLoading(true);
    try {
      if (asset === "sol") {
        const lamports = parseSolToLamports(amount);
        if (lamports === null) {
          setError(w.invalidAmount);
          return;
        }
        const ixs = await buildSolTransfer(address, to, lamports);
        const sig = await signAndSubmit(ixs);
        setStatus(w.success(formatSol(Number(lamports)), "SOL", to));
        setAmount("");
        void refreshSol();
        console.info("SOL withdraw tx", sig);
      } else {
        const raw = parseUsdcToRaw(amount);
        if (raw === null) {
          setError(w.invalidAmount);
          return;
        }
        const ixs = await buildUsdcTransfer(address, to, raw);
        const sig = await signAndSubmit(ixs);
        setStatus(w.success(formatFeeUnits(raw), ENTRY_FEE_SYMBOL, to));
        setAmount("");
        refreshBalance();
        console.info("USDC withdraw tx", sig);
      }
    } catch (err) {
      setError(formatTxError(err) || w.failed);
    } finally {
      setLoading(false);
    }
  }, [
    address,
    amount,
    asset,
    connected,
    recipient,
    refreshBalance,
    refreshSol,
    signAndSubmit,
    w,
  ]);

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[220] flex min-h-[100dvh] items-center justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            aria-label={w.close}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.22 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(10px)" }}
            transition={
              reduce ? { duration: 0.14 } : { type: "spring", duration: 0.42, bounce: 0 }
            }
            className="relative z-10 w-full max-w-md"
          >
            <GlassPanel crystal className="w-full !rounded-2xl p-5 sm:p-6">
              <h2
                id="withdraw-title"
                className="pr-8 text-[22px] font-black uppercase tracking-[-0.02em] text-white"
              >
                {w.title}
              </h2>
              <p className="mt-2 text-[13px] font-medium text-white/50">{w.hint}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(
                  [
                    ["usdc", w.assetUsdc],
                    ["sol", w.assetSol],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAsset(id)}
                    className={cn(
                      "rounded-xl border py-2.5 text-[12px] font-black uppercase tracking-[0.08em] transition-colors",
                      asset === id
                        ? "border-white/40 bg-white text-black"
                        : "border-white/15 bg-black/25 text-white/70 hover:border-white/30 hover:text-white",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mt-3 flex items-baseline gap-2 text-[13px] font-medium text-white/50">
                {w.balanceLabel}
                <span className="text-[17px] font-semibold tabular-nums tracking-tight text-white">
                  {displayBalance}
                </span>
                <span className="text-[12px] font-semibold tracking-[0.06em] text-white/45">
                  {symbol}
                </span>
              </p>

              <label className="mt-5 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                  {w.recipientLabel}
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={w.recipientPlaceholder}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/35 px-3.5 py-3 font-mono text-[13px] text-white outline-none placeholder:text-white/25 focus:border-white/35"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                  {w.amountLabel(symbol)}
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/35 px-3.5 py-3 text-[15px] font-semibold tabular-nums text-white outline-none placeholder:text-white/25 focus:border-white/35"
                  />
                  <button
                    type="button"
                    disabled={
                      asset === "usdc"
                        ? !balanceLabel || balanceLabel === "—"
                        : solBalanceLamports === null || solBalanceLamports <= 0
                    }
                    onClick={() => {
                      if (asset === "usdc") {
                        // The label is rounded for display; ask the chain for the exact balance.
                        if (address) {
                          void getUsdcBalance(address)
                            .then((raw) => setAmount(rawUsdcToInput(raw)))
                            .catch(() => {
                              if (balanceLabel && balanceLabel !== "—") setAmount(balanceLabel);
                            });
                        }
                      } else if (solBalanceLamports !== null && solBalanceLamports > 0) {
                        // Fee sponsor pays network fee → full balance can leave.
                        setAmount(lamportsToInput(solBalanceLamports));
                      }
                    }}
                    className="shrink-0 rounded-xl border border-white/20 px-3 text-[11px] font-bold uppercase tracking-wide text-white/80 hover:border-white/40 disabled:opacity-40"
                  >
                    {w.max}
                  </button>
                </div>
              </label>

              {error ? (
                <p className="mt-3 text-[13px] font-medium text-rose-300/90">{error}</p>
              ) : null}
              {status ? (
                <p className="mt-3 text-[13px] font-medium text-[#00f948]/90">{status}</p>
              ) : null}

              <button
                type="button"
                disabled={loading || !recipient.trim() || !amount.trim()}
                onClick={() => void submit()}
                className={cn(
                  "mt-5 w-full rounded-xl bg-white py-3.5 text-[13px] font-black uppercase tracking-[0.08em] text-black transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-40",
                )}
              >
                {loading ? w.sending : w.submit(symbol)}
              </button>

              <button
                type="button"
                aria-label={w.close}
                onClick={onClose}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <CloseIcon />
              </button>
            </GlassPanel>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
