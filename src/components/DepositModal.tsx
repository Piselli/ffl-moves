"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useDeposit } from "@/components/depositContext";
import { SPRING_PILL } from "@/lib/uiMotion";
import { useWallet } from "@/hooks/useSolanaWallet";
import { ENTRY_FEE_SYMBOL } from "@/lib/entryFee";
import { solanaWalletDefByAdapterName } from "@/lib/solanaWallets";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type Tab = "cash" | "crypto";

type DepositModalProps = {
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

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DepositModal({ open, onClose }: DepositModalProps) {
  const d = useSiteMessages().deposit;
  const reduce = Boolean(useReducedMotion());
  const { account, connected, walletName } = useWallet();
  const { balanceLabel, refreshBalance } = useDeposit();
  const address = account?.address ?? null;
  const wallet = walletName ? solanaWalletDefByAdapterName(walletName) : undefined;
  const walletLabel = wallet?.displayName ?? walletName ?? "Phantom";
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [tab, setTab] = useState<Tab>("cash");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setTab("cash");
      setCopied(false);
      setError(null);
      return;
    }
    refreshBalance();
  }, [open, refreshBalance]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(d.copyFailed);
    }
  };

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[220] flex min-h-[100dvh] items-center justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            aria-label={d.close}
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
            aria-labelledby="deposit-title"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, filter: "blur(10px)" }
            }
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, filter: "blur(10px)" }
            }
            transition={
              reduce
                ? { duration: 0.14 }
                : { type: "spring", duration: 0.42, bounce: 0 }
            }
            className="relative z-10 w-full max-w-md"
          >
            <GlassPanel crystal className="w-full !rounded-2xl p-5 sm:p-6">
              <h2
                id="deposit-title"
                className="pr-8 text-[22px] font-black uppercase tracking-[-0.02em] text-white"
              >
                {d.title}
              </h2>
              <p className="mt-2 flex items-baseline gap-2 text-[13px] font-medium text-white/50">
                {d.balanceLabel}
                <span className="text-[17px] font-semibold tabular-nums tracking-tight text-white">
                  {connected ? balanceLabel ?? "—" : "—"}
                </span>
                <span className="text-[12px] font-semibold tracking-[0.06em] text-white/45">
                  {ENTRY_FEE_SYMBOL}
                </span>
              </p>

              <LayoutGroup id="deposit-tabs">
              <div className="mt-5 flex gap-1 rounded-xl border border-white/15 bg-black/30 p-1">
                {(["cash", "crypto"] as const).map((id) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        "relative flex-1 rounded-xl py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
                        active ? "text-white" : "text-white/55 hover:text-white/80",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="deposit-tab-pill"
                          className="absolute inset-0 rounded-xl bg-white/[0.12]"
                          transition={reduce ? { duration: 0 } : SPRING_PILL}
                        />
                      ) : null}
                      <span className="relative z-10">
                        {id === "cash" ? d.tabCash : d.tabCrypto}
                      </span>
                    </button>
                  );
                })}
              </div>
              </LayoutGroup>

              <div className="mt-4 flex h-[236px] flex-col">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={tab}
                    className="flex min-h-0 flex-1 flex-col"
                    initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
                    transition={{ duration: reduce ? 0.1 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                  >
                <p className="min-h-[40px] text-[15px] font-medium leading-snug text-white/88">
                  {tab === "cash" ? d.cashHint : d.cryptoHint}
                </p>
                <p className="mt-1 min-h-[36px] text-[12px] font-medium leading-snug text-white/48">
                  {tab === "cash" ? d.cashSoon : ""}
                </p>

                {address ? (
                  <div className="mt-2 rounded-xl border border-white/20 bg-black/35 px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                      {d.solanaAddress}
                    </p>
                    <p className="mt-1.5 break-all font-mono text-[14px] font-medium leading-relaxed tracking-[-0.01em] text-white">
                      {address}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-white/15 bg-black/35 px-3.5 py-3 text-[14px] font-medium text-white/70">
                    {d.needWallet}
                  </div>
                )}

                <div className="mt-auto flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => void copyAddress()}
                    disabled={!address}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/90 transition-[transform,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/40 hover:text-white active:scale-[0.98] disabled:opacity-40"
                  >
                    <CopyIcon />
                    <motion.span
                      key={copied ? "copied" : "copy"}
                      initial={reduce ? false : { opacity: 0.7, filter: "blur(2px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {copied ? d.copied : d.copyAddress}
                    </motion.span>
                  </button>
                  {wallet?.buyGuideUrl ? (
                    <a
                      href={wallet.buyGuideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/90 transition-[transform,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/40 hover:text-white active:scale-[0.98]"
                    >
                      {d.buyGuideCta(walletLabel)}
                      <ExternalIcon />
                    </a>
                  ) : null}
                </div>

                {error ? (
                  <p className="mt-3 text-[12px] font-medium leading-snug text-amber-100/90">{error}</p>
                ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </GlassPanel>
              <button
                type="button"
                onClick={onClose}
                aria-label={d.close}
                className="absolute right-1.5 top-1.5 z-30 grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.06] hover:text-white/85 active:scale-[0.96]"
              >
                <CloseIcon />
              </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
