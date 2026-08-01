"use client";

import Link from "next/link";
import { DuotoneIssuePreview } from "@/components/design-preview/DuotoneIssuePreview";
import { TheLinePreview } from "@/components/design-preview/TheLinePreview";
import { PerforatedSlotPreview } from "@/components/design-preview/PerforatedSlotPreview";

export default function DesignPreviewPage() {
  return (
    <div className="min-h-screen bg-[#050506] pb-24">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050506]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#00f948]/80">
              MoveMatch · Visual Concepts
            </p>
            <h1 className="mt-0.5 text-lg font-medium text-white">3 whole-site identities</h1>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-sm border border-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/60 hover:border-white/30 hover:text-white"
          >
            ← Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-20 px-4 pt-10 sm:px-6 sm:pt-14">
        <section className="max-w-3xl space-y-6">
          <p className="text-base leading-relaxed text-white/55">
            Три різні концепти для <strong className="font-medium text-white/80">всього сайту</strong>. Кожен —
            3 екрани (home, squad, leaderboard) + concept shot. Не dark hero clone, не gallery clone.
          </p>
          <Link
            href="/design-preview/homepage"
            className="inline-flex items-center gap-2 rounded-lg border border-[#00f948]/35 bg-[#00f948]/10 px-4 py-3 text-sm font-medium text-[#00f948] transition-colors hover:bg-[#00f948]/15"
          >
            Homepage + nav redesign (locker hero IA)
            <span aria-hidden>→</span>
          </Link>
        </section>

        <DuotoneIssuePreview />
        <TheLinePreview />
        <PerforatedSlotPreview />

        <footer className="border-t border-white/[0.06] pt-8 text-center text-xs text-white/30">
          /design-preview · prod untouched
        </footer>
      </div>
    </div>
  );
}
