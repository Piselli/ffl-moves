"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/hooks/useSolanaWallet";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** Season rail — Copy invite link only, above Register. */
export function SeasonInviteActions({ className }: { className?: string }) {
  const season = useSiteMessages().pages.seasonLeaderboard;
  const { account, connected } = useWallet();
  const wallet = account?.address?.toString() ?? null;
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setLink(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/invite/me?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { ok?: boolean; link?: string }) => {
        if (cancelled || !body?.ok) return;
        setLink(body.link ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const copy = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [link]);

  if (!connected || !wallet) return null;

  return (
    <div className={cn(className)}>
      <button
        type="button"
        onClick={copy}
        disabled={!link}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-white/14 bg-white/[0.04] px-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white/80 transition hover:border-white/22 hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
      >
        {copied ? season.railInviteCopied : season.railInviteCopyLink}
      </button>
    </div>
  );
}
