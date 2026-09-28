"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStoredInviteCode,
  normalizeInviteCode,
  storeInviteCode,
} from "@/lib/inviteClient";
import { cn } from "@/lib/utils";

export type InviteEntryCopy = {
  haveCode: string;
  label: string;
  placeholder: string;
  save: string;
  change: string;
  applied: (code: string) => string;
};

/**
 * Compact “Have an invite code?” field for pre-register surfaces.
 * Writes the same cookie/localStorage as `?inv=` first-touch capture.
 *
 * Copy must be passed as props — do NOT call useSiteMessages here.
 * LockerTablet lives inside drei `<Html>`, which is outside LocaleProvider.
 */
export function InviteCodeEntry({
  className,
  compact = false,
  defaultOpen = false,
  copy,
}: {
  className?: string;
  compact?: boolean;
  /** Open the input immediately (Season rail before first lock). */
  defaultOpen?: boolean;
  copy: InviteEntryCopy;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const existing = getStoredInviteCode();
    if (existing) {
      setSaved(existing);
      setValue(existing);
    }
  }, []);

  const apply = useCallback(() => {
    const code = storeInviteCode(value, { overwrite: true });
    if (!code) return;
    setSaved(code);
    setOpen(false);
  }, [value]);

  if (saved && !open) {
    return (
      <div className={cn("text-[12px] text-white/45", className)}>
        <span>{copy.applied(saved.toUpperCase())}</span>
        <button
          type="button"
          className="ml-2 text-white/60 underline decoration-white/20 underline-offset-2 hover:text-white"
          onClick={() => setOpen(true)}
        >
          {copy.change}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-left text-[12px] text-white/45 underline decoration-white/20 underline-offset-2 hover:text-white/70",
          className,
        )}
      >
        {copy.haveCode}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", compact && "gap-1.5", className)}>
      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        {copy.label}
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          placeholder={copy.placeholder}
          className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={apply}
          disabled={!normalizeInviteCode(value)}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/18 disabled:opacity-40"
        >
          {copy.save}
        </button>
      </div>
    </div>
  );
}
