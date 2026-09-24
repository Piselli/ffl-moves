"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PublicKey } from "@solana/web3.js";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useDeposit } from "@/components/depositContext";
import { useWallet } from "@/hooks/useSolanaWallet";
import { buildUsdcTransfer } from "@/lib/chainClient";
import { displayAmountToRaw, ENTRY_FEE_SYMBOL, formatFeeUnits } from "@/lib/entryFee";
import { cn, formatTxError } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

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

export function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const w = useSiteMessages().withdraw;
  const reduce = Boolean(useReducedMotion());
  const { account, connected, signAndSubmit, feePayer } = useWallet();
  const { balanceLabel, refreshBalance } = useDeposit();
  const address = account?.address ?? null;
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!open) {
      setRecipient("");
      setAmount("");
      setError(null);
      setStatus(null);
      setLoading(false);
      return;
    }
    refreshBalance();
  }, [open, refreshBalance]);

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
    const n = Number(amount.replace(",", ".").trim());
    if (!Number.isFinite(n) || n <= 0) {
      setError(w.invalidAmount);
      return;
    }
    const raw = BigInt(displayAmountToRaw(n));
    if (raw <= BigInt(0)) {
      setError(w.invalidAmount);
      return;
    }
    setLoading(true);
    try {
      const ixs = await buildUsdcTransfer(address, to, raw, {
        ataPayer: feePayer ?? undefined,
      });
      const sig = await signAndSubmit(ixs);
      setStatus(w.success(formatFeeUnits(raw), to));
      setAmount("");
      refreshBalance();
      console.info("USDC withdraw tx", sig);
    } catch (err) {
      setError(formatTxError(err) || w.failed);
    } finally {
      setLoading(false);
    }
  }, [address, amount, connected, feePayer, recipient, refreshBalance, signAndSubmit, w]);

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
              <p className="mt-3 flex items-baseline gap-2 text-[13px] font-medium text-white/50">
                {w.balanceLabel}
                <span className="text-[17px] font-semibold tabular-nums tracking-tight text-white">
                  {connected ? balanceLabel ?? "—" : "—"}
                </span>
                <span className="text-[12px] font-semibold tracking-[0.06em] text-white/45">
                  {ENTRY_FEE_SYMBOL}
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
                  {w.amountLabel(ENTRY_FEE_SYMBOL)}
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
                    disabled={!balanceLabel || balanceLabel === "—"}
                    onClick={() => {
                      if (balanceLabel && balanceLabel !== "—") setAmount(balanceLabel);
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
                {loading ? w.sending : w.submit}
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
