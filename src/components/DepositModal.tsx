"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useFundWallet } from "@privy-io/react-auth/solana";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useDeposit } from "@/components/depositContext";
import { useLogin } from "@/components/LoginProvider";
import { usePrivyAuth } from "@/components/PrivyAppProvider";
import { SPRING_PILL } from "@/lib/uiMotion";
import { useWallet } from "@/hooks/useSolanaWallet";
import { ENTRY_FEE_SYMBOL } from "@/lib/entryFee";
import { isPrivyConfigured } from "@/lib/privy";
import { isPrivyOnrampUsdcAvailable } from "@/lib/privyFunding";
import {
  openExternalUsdcOnramp,
  type OnrampPaymentHint,
} from "@/lib/onramp";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type Tab = "cash" | "crypto";

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
};

type DepositCopy = ReturnType<typeof useSiteMessages>["deposit"];

const AMOUNT_PRESETS = ["5", "10", "25"] as const;

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

function CardIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ApplePayIcon() {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 814 1000" fill="currentColor" aria-hidden>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-163-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

function GooglePayIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.31 2.99-7.42z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.23-2.5c-.9.6-2.04.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.58A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.91A6 6 0 0 1 6.08 12c0-.66.11-1.31.31-1.91V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49l3.33-2.58z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.96 2.97 14.7 2 12 2A10 10 0 0 0 3.06 7.51l3.33 2.58C7.18 7.72 9.39 5.96 12 5.96z"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4 text-white/35" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const btnSecondary =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/90 transition-[transform,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/40 hover:text-white active:scale-[0.98] disabled:opacity-40";

function parseAmount(raw: string): string | null {
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 5 || n > 5000) return null;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function useCashOnramp(address: string | null) {
  const { fundWallet } = useFundWallet();
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (amountUsd: string, method: OnrampPaymentHint) => {
      if (!address) throw new Error("missing address");
      setLoading(true);
      try {
        if (
          openExternalUsdcOnramp({
            address,
            amountUsd,
            method,
          })
        ) {
          return "external" as const;
        }
        // Stripe fails in UA — Privy Solana fundWallet uses Coinbase/MoonPay, not Stripe.
        await fundWallet({
          address,
          options: {
            amount: amountUsd,
            asset: "USDC",
            defaultFundingMethod: "card",
            card: { preferredProvider: "coinbase" },
          },
        });
        return "privy" as const;
      } finally {
        setLoading(false);
      }
    },
    [address, fundWallet],
  );

  return { run, loading };
}

function CashMethods({
  address,
  d,
  amount,
  onStatus,
  onError,
  needLogin,
  onLogin,
  mainnetOnly,
}: {
  address: string | null;
  d: DepositCopy;
  amount: string;
  onStatus: (msg: string | null) => void;
  onError: (msg: string | null) => void;
  needLogin: boolean;
  onLogin: () => void;
  mainnetOnly: boolean;
}) {
  const { run, loading } = useCashOnramp(address);

  const onPick = async (method: OnrampPaymentHint) => {
    if (mainnetOnly) {
      onError(d.buyCardMainnetOnly);
      return;
    }
    if (needLogin) {
      onLogin();
      return;
    }
    if (!address) {
      onError(d.needWallet);
      return;
    }
    const parsed = parseAmount(amount);
    if (!parsed) {
      onError(d.amountInvalid);
      return;
    }
    onError(null);
    onStatus(null);
    try {
      const result = await run(parsed, method);
      onStatus(result === "external" ? d.buyCardExternalOpened : d.buyCardPending);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? "");
      if (/cancel|clos|abort|dismiss|exited/i.test(msg)) return;
      onError(d.buyCardFailed);
    }
  };

  const methods: { id: OnrampPaymentHint; label: string; icon: ReactNode; badge?: string }[] = [
    { id: "card", label: d.methodCard, icon: <CardIcon />, badge: d.instant },
    { id: "apple", label: d.methodApplePay, icon: <ApplePayIcon /> },
    { id: "google", label: d.methodGooglePay, icon: <GooglePayIcon /> },
  ];

  return (
    <div className="mt-4 flex flex-col gap-2">
      {methods.map((m) => (
        <button
          key={m.id}
          type="button"
          disabled={loading}
          onClick={() => void onPick(m.id)}
          className="group flex w-full items-center gap-3.5 rounded-2xl border border-white/14 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-3.5 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/30 hover:from-white/[0.1] active:scale-[0.99] disabled:opacity-50"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/12 bg-black/45 text-white">
            {m.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.015em] text-white">
                {loading ? d.buyCardLoading : m.label}
              </span>
              {m.badge ? (
                <span className="rounded-md bg-[#00f948]/16 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9dffb8]">
                  {m.badge}
                </span>
              ) : null}
            </span>
          </span>
          <ChevronIcon />
        </button>
      ))}
    </div>
  );
}

function CashTab({
  address,
  d,
  amount,
  setAmount,
  status,
  setStatus,
  error,
  setError,
  reduce,
}: {
  address: string | null;
  d: DepositCopy;
  amount: string;
  setAmount: (v: string) => void;
  status: string | null;
  setStatus: (msg: string | null) => void;
  error: string | null;
  setError: (msg: string | null) => void;
  reduce: boolean;
}) {
  const privyReady = isPrivyConfigured();
  const privy = usePrivyAuth();
  const { openLogin } = useLogin();
  const onrampOk = isPrivyOnrampUsdcAvailable();
  const needLogin = privyReady && onrampOk && !privy.authenticated;
  const mainnetOnly = privyReady && !onrampOk;

  if (!privyReady) {
    return <p className="mt-3 text-[13px] font-medium text-white/55">{d.buyCardNeedLogin}</p>;
  }

  return (
    <>
      {status ? (
        <p className="mt-2 text-[12px] font-medium leading-snug text-[#9dffb8]/90">{status}</p>
      ) : mainnetOnly ? (
        <p className="mt-2 text-[12px] font-medium leading-snug text-white/45">{d.buyCardMainnetOnly}</p>
      ) : needLogin ? (
        <p className="mt-2 text-[12px] font-medium leading-snug text-white/45">{d.buyCardNeedLogin}</p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        {AMOUNT_PRESETS.map((a) => {
          const active = amount === a;
          return (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              className={cn(
                "relative h-10 min-w-[3.25rem] flex-1 rounded-xl text-[13px] font-semibold tabular-nums tracking-tight transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
                active ? "text-white" : "text-white/50 hover:text-white/80",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="deposit-amount-pill"
                  className="absolute inset-0 rounded-xl border border-white/25 bg-white/[0.12]"
                  transition={reduce ? { duration: 0 } : SPRING_PILL}
                />
              ) : (
                <span className="absolute inset-0 rounded-xl border border-white/10 bg-black/30" />
              )}
              <span className="relative z-10">${a}</span>
            </button>
          );
        })}
        <label className="relative flex h-10 min-w-[5.5rem] flex-[1.15] items-center rounded-xl border border-white/15 bg-black/40 px-3 focus-within:border-white/35">
          <span className="mr-1 text-[13px] font-semibold text-white/40">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, "").slice(0, 8))}
            aria-label={d.amountCustom}
            placeholder="40"
            className="w-full bg-transparent text-[13px] font-semibold tabular-nums text-white outline-none placeholder:text-white/25"
          />
        </label>
      </div>

      <CashMethods
        address={address}
        d={d}
        amount={amount}
        needLogin={needLogin}
        onLogin={openLogin}
        mainnetOnly={mainnetOnly}
        onStatus={(msg) => {
          setStatus(msg);
          setError(null);
        }}
        onError={(msg) => {
          setError(msg);
          setStatus(null);
        }}
      />

      {error ? (
        <p className="mt-2 text-[12px] font-medium leading-snug text-amber-100/90">{error}</p>
      ) : null}
    </>
  );
}

function CashTabBody(props: {
  address: string | null;
  d: DepositCopy;
  amount: string;
  setAmount: (v: string) => void;
  status: string | null;
  setStatus: (msg: string | null) => void;
  error: string | null;
  setError: (msg: string | null) => void;
  reduce: boolean;
}) {
  if (!isPrivyConfigured()) {
    return <p className="mt-3 text-[13px] font-medium text-white/55">{props.d.buyCardNeedLogin}</p>;
  }
  return <CashTab {...props} />;
}

export function DepositModal({ open, onClose }: DepositModalProps) {
  const d = useSiteMessages().deposit;
  const reduce = Boolean(useReducedMotion());
  const { account, connected } = useWallet();
  const { balanceLabel, refreshBalance } = useDeposit();
  const address = account?.address ?? null;
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [tab, setTab] = useState<Tab>("cash");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("10");

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
      setStatus(null);
      setAmount("10");
      return;
    }
    refreshBalance();
  }, [open, refreshBalance]);

  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => refreshBalance(), 4000);
    return () => window.clearTimeout(t);
  }, [status, refreshBalance]);

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
            layout
            role="dialog"
            aria-modal="true"
            aria-labelledby="deposit-title"
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

              <div className="mt-4 flex flex-col">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={tab}
                    layout
                    className="flex flex-col"
                    initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
                    transition={{ duration: reduce ? 0.1 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {tab === "cash" ? (
                      <>
                        <p className="text-[16px] font-semibold leading-snug tracking-[-0.015em] text-white">
                          {d.cashHint}
                        </p>
                        <CashTabBody
                          address={address}
                          d={d}
                          amount={amount}
                          setAmount={setAmount}
                          status={status}
                          setStatus={setStatus}
                          error={error}
                          setError={setError}
                          reduce={reduce}
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-[16px] font-semibold leading-snug tracking-[-0.015em] text-white">
                          {d.cryptoHint}
                        </p>
                        <p className="mt-1.5 text-[12px] font-medium leading-snug text-white/45">
                          {d.cryptoTransferHint}
                        </p>
                        {address ? (
                          <div className="mt-4 rounded-2xl border border-white/16 bg-black/40 px-3.5 py-3.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                              {d.solanaAddress}
                            </p>
                            <p className="mt-1.5 break-all font-mono text-[14px] font-medium leading-relaxed tracking-[-0.01em] text-white">
                              {address}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-white/12 bg-black/35 px-3.5 py-3.5 text-[14px] font-medium text-white/70">
                            {d.needWallet}
                          </div>
                        )}
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void copyAddress()}
                            disabled={!address}
                            className={btnSecondary}
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
                        </div>
                        {error ? (
                          <p className="mt-3 text-[12px] font-medium leading-snug text-amber-100/90">
                            {error}
                          </p>
                        ) : null}
                      </>
                    )}
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
