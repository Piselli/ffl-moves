"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { Form8Lockup } from "@/components/Form8Mark";
import { REGISTER_CTA_CLASS } from "@/components/season/seasonActionShared";
import { cn } from "@/lib/utils";

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
  googleConfigured: boolean;
  error?: string | null;
  /** Local-only email field when Google is off. */
  devLoginAllowed?: boolean;
  onDevLogin?: (email: string) => void | Promise<void>;
};

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M5.3 14.3l-.8.6-2.5 1.9C3.5 20.1 7.4 22.5 12 22.5c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 1-3.6 1-2.8 0-5.1-1.9-5.9-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.2 7.2A10.4 10.4 0 0 0 2 12c0 1.7.4 3.3 1.2 4.8l3.3-2.6A6.2 6.2 0 0 1 5.8 12c0-.8.2-1.6.4-2.3L3.2 7.2z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 2.1 14.7 1.2 12 1.2 7.4 1.2 3.5 3.9 1.9 7.9l3.3 2.6C6.9 7.9 9.2 5.3 12 5.3z"
      />
    </svg>
  );
}

export function PartnerLoginModal({
  open,
  googleConfigured,
  error,
  devLoginAllowed,
  onDevLogin,
}: Props) {
  const reduce = Boolean(useReducedMotion());
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [devEmail, setDevEmail] = useState("");
  const [busy, setBusy] = useState(false);

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

  if (!portalRoot) return null;

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
                  Whitelisted Google accounts only. Each partner sees their own links and
                  stats.
                </p>

                {error ? (
                  <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-center text-[12px] text-amber-100/90">
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 space-y-3">
                  {googleConfigured ? (
                    <a
                      href="/api/partners/auth/login"
                      className={cn(
                        REGISTER_CTA_CLASS,
                        "w-full !normal-case !tracking-normal gap-2.5 !text-[13px] !font-semibold",
                      )}
                    >
                      <GoogleIcon />
                      Continue with Google
                    </a>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center">
                      <p className="text-[12px] leading-relaxed text-white/50">
                        Google sign-in is almost ready. Open the{" "}
                        <span className="text-white/75">invite link</span> we sent you — it
                        signs you in instantly.
                      </p>
                    </div>
                  )}

                  {devLoginAllowed && onDevLogin ? (
                    <div className="border-t border-white/[0.08] pt-4">
                      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
                        Local preview
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={devEmail}
                          onChange={(e) => setDevEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && devEmail.trim()) {
                              setBusy(true);
                              void Promise.resolve(onDevLogin(devEmail)).finally(() =>
                                setBusy(false),
                              );
                            }
                          }}
                          placeholder="whitelisted@gmail.com"
                          className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/45 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/28 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={busy || !devEmail.trim()}
                          onClick={() => {
                            setBusy(true);
                            void Promise.resolve(onDevLogin(devEmail)).finally(() =>
                              setBusy(false),
                            );
                          }}
                          className="shrink-0 rounded-xl border border-[#00f948]/35 bg-[#00f948]/15 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#00f948] transition hover:bg-[#00f948]/25 disabled:opacity-40"
                        >
                          Enter
                        </button>
                      </div>
                    </div>
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
