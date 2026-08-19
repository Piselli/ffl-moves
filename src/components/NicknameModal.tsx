"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

interface NicknameModalProps {
  open?: boolean;
  address: string;
  currentNickname: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NicknameModal({
  open = true,
  address,
  currentNickname,
  onSave,
  onClose,
}: NicknameModalProps) {
  const nn = useSiteMessages().pages.nickname;
  const m = useSiteMessages();
  const reduce = Boolean(useReducedMotion());
  const [value, setValue] = useState(currentNickname ?? "");
  const [error, setError] = useState("");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    setValue(currentNickname ?? "");
    setError("");
  }, [open, currentNickname]);

  useEffect(() => {
    if (!open || !portalRoot) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [open, portalRoot]);

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

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(nn.errEmpty);
      return;
    }
    if (trimmed.length < 2) {
      setError(nn.errMin);
      return;
    }
    onSave(trimmed);
    onClose();
  };

  const shortAddr = address.slice(0, 6) + "..." + address.slice(-4);

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nickname-modal-title"
        >
          <motion.button
            type="button"
            aria-label={m.nav.menuClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.22 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-md"
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
          >
            <GlassPanel crystal className="relative w-full !rounded-2xl p-5 sm:p-6">
              <h2
                id="nickname-modal-title"
                className="pr-8 text-[22px] font-black uppercase tracking-[-0.02em] text-white"
              >
                {currentNickname ? nn.titleEdit : nn.titleWelcome}
              </h2>
              <p className="mt-2 text-[13px] font-medium leading-snug text-white/50">
                {currentNickname ? nn.descEdit : nn.descWelcome}
              </p>

              <div className="mt-5 rounded-xl border border-white/20 bg-black/35 px-3.5 py-3">
                <p className="flex items-center gap-2 font-mono text-[14px] font-medium tracking-[-0.01em] text-white">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f948]" />
                  {shortAddr}
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {nn.fieldLabel}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value.slice(0, 20));
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  placeholder={nn.placeholder}
                  maxLength={20}
                  className={cn(
                    "mt-1.5 w-full rounded-xl border bg-black/35 px-3.5 py-3 text-[15px] font-medium text-white outline-none placeholder:text-white/25 transition-[border-color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    error
                      ? "border-rose-400/60 focus:border-rose-400/80"
                      : "border-white/20 focus:border-white/40",
                  )}
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[12px] font-medium text-rose-400">{error}</p>
                  <p className="text-[11px] font-medium tabular-nums text-white/35">
                    {value.length}/20
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/20 py-3.5 text-[13px] font-bold uppercase tracking-[0.08em] text-white/70 transition-[transform,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/35 hover:text-white active:scale-[0.98]"
                >
                  {nn.later}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!value.trim()}
                  className="flex-[1.35] rounded-xl bg-white py-3.5 text-[15px] font-black uppercase tracking-[0.04em] text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-[transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100"
                >
                  {nn.save}
                </button>
              </div>
            </GlassPanel>
              <button
                type="button"
                onClick={onClose}
                aria-label={m.nav.menuClose}
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
