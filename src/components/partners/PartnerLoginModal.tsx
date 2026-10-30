"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { Form8Lockup } from "@/components/Form8Mark";
import { REGISTER_CTA_CLASS } from "@/components/season/seasonActionShared";
import { useLogin } from "@/components/LoginProvider";
import { useWallet } from "@/hooks/useSolanaWallet";
import { shortenAddress, cn } from "@/lib/utils";

const CRYSTAL_SHEET = {
  ["--lt-glass-bg" as string]: "rgba(8,10,14,0.52)",
  ["--lt-glass-blur" as string]: "48px",
  ["--lt-glass-ring" as string]: "rgba(255,255,255,0.32)",
  ["--lt-glass-shadow" as string]:
    "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -20px 40px rgba(0,0,0,0.5), 0 18px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
  ["--lt-glass-sheen" as string]:
    "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 18%, transparent 42%), linear-gradient(320deg, rgba(0,249,72,0.06) 0%, transparent 40%)",
};

const SHEET_SPRING = { type: "spring" as const, stiffness: 380, damping: 34 };

type Props = {
  open: boolean;
  error?: string | null;
  onSignedIn: () => void | Promise<void>;
};

export function PartnerLoginModal({ open, error, onSignedIn }: Props) {
  const reduce = Boolean(useReducedMotion());
  const { openLogin } = useLogin();
  const { connected, address, signMessage } = useWallet();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const enter = async () => {
    setLocalError(null);
    if (!address) {
      openLogin();
      return;
    }
    if (!signMessage) {
      setLocalError("This wallet cannot sign messages. Try Phantom / Solflare.");
      return;
    }
    setBusy(true);
    try {
      const ts = Date.now();
      const message = `FORM8 partner cabinet\nWallet: ${address}\nTs: ${ts}`;
      const signature = await signMessage(message);
      if (!signature) {
        setLocalError("Signature cancelled.");
        return;
      }
      const res = await fetch("/api/partners/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, ts, signature }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLocalError(body.error ?? `Login failed (${res.status})`);
        return;
      }
      await onSignedIn();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  if (!portalRoot) return null;

  const showError = localError || error;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="partner-login-root"
          className="fixed inset-0 z-[210] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-login-title"
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={reduce ? { duration: 0.16 } : SHEET_SPRING}
          >
            <div className="rounded-2xl bg-[#080a0e]">
              <GlassPanel crystal className="w-full !rounded-2xl p-6 sm:p-7" style={CRYSTAL_SHEET}>
                <div className="mb-5 flex justify-center">
                  <Form8Lockup wordmarkClassName="text-white/85" />
                </div>
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#00f948]/80">
                  Partner access
                </p>
                <h2
                  id="partner-login-title"
                  className="mt-2 text-center font-display text-2xl font-black uppercase tracking-tight text-white sm:text-[1.65rem]"
                >
                  Partner cabinet
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-center text-[13px] leading-relaxed text-white/45">
                  Only whitelisted wallets. Connect your FORM8 wallet and sign once to
                  open your cabinet.
                </p>

                {showError ? (
                  <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-center text-[12px] text-amber-100/90">
                    {showError}
                  </p>
                ) : null}

                <div className="mt-6 space-y-3">
                  {connected && address ? (
                    <p className="text-center text-[12px] text-white/40">
                      Connected ·{" "}
                      <span className="font-mono text-white/65">
                        {shortenAddress(address)}
                      </span>
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void enter()}
                    className={cn(REGISTER_CTA_CLASS, "w-full disabled:opacity-50")}
                  >
                    {busy
                      ? "Signing…"
                      : connected
                        ? "Sign in with wallet"
                        : "Connect wallet"}
                  </button>

                  {!connected ? (
                    <p className="text-center text-[11px] text-white/30">
                      Use the same wallet that is on the partner whitelist.
                    </p>
                  ) : null}
                </div>
              </GlassPanel>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
