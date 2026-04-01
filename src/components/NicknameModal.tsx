"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NicknameModalProps {
  address: string;
  currentNickname: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function NicknameModal({
  address,
  currentNickname,
  onSave,
  onClose,
}: NicknameModalProps) {
  const [value, setValue] = useState(currentNickname ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) { setError("Введи нікнейм"); return; }
    if (trimmed.length < 2) { setError("Мінімум 2 символи"); return; }
    onSave(trimmed);
    onClose();
  };

  const shortAddr = address.slice(0, 6) + "..." + address.slice(-4);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#111214] border border-white/[0.10] rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00C46A]/60 to-transparent" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none">
                {currentNickname ? "Змінити нікнейм" : "Вітаємо!"}
              </h2>
              <p className="text-xs text-white/30 mt-1.5">
                {currentNickname
                  ? "Це ім'я буде відображатись у лідерборді"
                  : "Обери нікнейм — він відображатиметься замість адреси гаманця"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/20 hover:text-white/60 transition-colors p-1 -mr-1 -mt-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Wallet address */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00C46A] shrink-0" />
            <span className="text-xs text-white/30 font-mono">{shortAddr}</span>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">
              Нікнейм
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value.slice(0, 20)); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="Наприклад: Горошко"
              maxLength={20}
              className={cn(
                "w-full px-4 py-3 rounded-xl bg-white/[0.05] border text-sm text-white placeholder-white/20 outline-none transition-all font-medium",
                error
                  ? "border-rose-500/60 focus:border-rose-500/80"
                  : "border-white/[0.08] focus:border-[#00C46A]/50 focus:bg-white/[0.07]"
              )}
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-rose-400">{error}</p>
              <p className="text-[10px] text-white/20 tabular-nums">{value.length}/20</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/40 font-semibold hover:text-white/70 hover:border-white/[0.15] transition-all"
            >
              Пізніше
            </button>
            <button
              onClick={handleSave}
              disabled={!value.trim()}
              className="flex-2 flex-grow py-2.5 px-5 rounded-xl bg-[#00C46A] text-black text-sm font-display font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Зберегти
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
