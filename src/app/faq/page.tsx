"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { SOCIAL_TG_HANDLE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { SeasonPageWash } from "@/components/season/seasonPageChrome";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import { REGISTER_CTA_CLASS } from "@/components/season/seasonActionShared";
import type { FaqAnswerBlock, FaqCategory, FaqCategoryId, FaqItem } from "@/i18n/pages";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

function categoryIndex(categories: FaqCategory[], id: FaqCategoryId): number {
  const i = categories.findIndex((c) => c.id === id);
  return i >= 0 ? i + 1 : 0;
}

function AnswerBlock({ block }: { block: FaqAnswerBlock }) {
  if (block.type === "p") {
    return <p className="text-[14px] leading-relaxed text-white/55">{block.text}</p>;
  }
  return (
    <ul className="space-y-2">
      {block.items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-white/55">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-white/30" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function FaqRow({
  item,
  catId,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  catId: FaqCategoryId;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const anchorId = `${catId}--${item.id}`;

  return (
    <div id={anchorId} className="scroll-mt-28" style={{ scrollMarginTop: "7rem" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors sm:px-5",
          isOpen ? "bg-white/[0.02]" : "hover:bg-white/[0.015]",
        )}
      >
        <span className="text-[14px] font-semibold leading-snug text-white/85 sm:text-[15px]">
          {item.q}
        </span>
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-white/35 transition-transform duration-200",
            isOpen && "rotate-180 text-white/55",
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="content"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/[0.05] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              {item.a.map((block, i) => (
                <AnswerBlock key={i} block={block} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function flattenAnswerText(blocks: FaqAnswerBlock[]): string {
  return blocks
    .map((b) => (b.type === "p" ? b.text : b.items.join(" ")))
    .join(" ")
    .toLowerCase();
}

export default function FaqPage() {
  const m = useSiteMessages();
  const faq = m.pages.faq;
  const reduce = useReducedMotion();

  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of faq.categories) {
      for (const it of cat.items) {
        map.set(`${cat.id}--${it.id}`, `${it.q.toLowerCase()} ${flattenAnswerText(it.a)}`);
      }
    }
    return map;
  }, [faq]);

  const filteredCategories = useMemo<FaqCategory[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faq.categories;
    return faq.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((it) => {
          const text = searchIndex.get(`${cat.id}--${it.id}`) ?? "";
          return text.includes(q);
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [faq.categories, query, searchIndex]);

  const totalMatches = useMemo(
    () => filteredCategories.reduce((s, c) => s + c.items.length, 0),
    [filteredCategories],
  );

  const allItemKeys = useMemo(() => {
    const keys: string[] = [];
    for (const cat of faq.categories) for (const it of cat.items) keys.push(`${cat.id}--${it.id}`);
    return keys;
  }, [faq]);

  const visibleItemKeys = useMemo(() => {
    const keys: string[] = [];
    for (const cat of filteredCategories) for (const it of cat.items) keys.push(`${cat.id}--${it.id}`);
    return keys;
  }, [filteredCategories]);

  const allVisibleOpen = visibleItemKeys.length > 0 && visibleItemKeys.every((k) => openIds.has(k));

  const toggleItem = useCallback((key: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setOpenIds(new Set(visibleItemKeys)), [visibleItemKeys]);
  const collapseAll = useCallback(() => setOpenIds(new Set()), []);

  useEffect(() => {
    if (allItemKeys.length === 0) return;
    const initial = new Set<string>();
    initial.add(allItemKeys[0]);

    if (typeof window !== "undefined" && window.location.hash) {
      const hashKey = window.location.hash.replace(/^#/, "");
      if (allItemKeys.includes(hashKey)) {
        initial.add(hashKey);
        setTimeout(() => {
          document.getElementById(hashKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    }
    setOpenIds(initial);
  }, [allItemKeys]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      <main className={cn("relative mx-auto max-w-4xl px-5 pb-20 sm:px-8", PRODUCT_PAGE_TOP)}>
        <header className="mb-5 sm:mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{faq.eyebrow}</p>
          <h1 className="mt-0.5 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {faq.title}
          </h1>
        </header>

        {/* Search + bulk toggle */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-h-0 flex-1 max-w-xl">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={faq.searchPlaceholder}
              aria-label={faq.searchAriaLabel}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/30 transition-colors focus:border-white/20 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={faq.clearSearch}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/70"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => (allVisibleOpen ? collapseAll() : expandAll())}
            disabled={visibleItemKeys.length === 0}
            className="shrink-0 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            {allVisibleOpen ? faq.collapseAll : faq.expandAll}
          </button>
        </div>

        {query.trim() ? (
          <p className="mb-6 text-[11px] text-white/35">{faq.foundCount(totalMatches)}</p>
        ) : null}

        {/* Category navigation */}
        {!query.trim() ? (
          <nav aria-label="FAQ categories" className="mb-8 flex flex-wrap gap-2">
            {faq.categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 transition hover:border-white/30 hover:text-white/85"
              >
                {cat.title}
              </a>
            ))}
          </nav>
        ) : null}

        {/* Categories */}
        <div className="space-y-5">
          {filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
              <p className="mb-1 font-display text-lg font-black uppercase tracking-tight text-white/75">
                {faq.noResultsTitle}
              </p>
              <p className="mx-auto mb-5 max-w-md text-sm text-white/40">{faq.noResultsHint}</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/30 hover:text-white"
              >
                {faq.clearSearch}
              </button>
            </div>
          ) : (
            filteredCategories.map((cat, ci) => (
              <motion.section
                key={cat.id}
                id={`cat-${cat.id}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(ci * 0.04, 0.12), ease: EASE_OUT }}
                style={{ scrollMarginTop: "100px" }}
              >
                <GlassPanel matte>
                  <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
                    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
                      <span
                        className="row-span-2 self-center font-mono text-[2rem] font-medium leading-none tabular-nums tracking-tight text-white/22 sm:text-[2.25rem]"
                        aria-hidden
                      >
                        {String(categoryIndex(faq.categories, cat.id)).padStart(2, "0")}
                      </span>
                      <h2 className="font-display text-[13px] font-black uppercase tracking-[0.08em] text-white/80 sm:text-sm">
                        {cat.title}
                      </h2>
                      <p className="text-[11px] leading-snug text-white/35">{cat.blurb}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-white/[0.05]">
                    {cat.items.map((item) => {
                      const key = `${cat.id}--${item.id}`;
                      return (
                        <FaqRow
                          key={key}
                          item={item}
                          catId={cat.id}
                          isOpen={openIds.has(key)}
                          onToggle={() => toggleItem(key)}
                        />
                      );
                    })}
                  </div>
                </GlassPanel>
              </motion.section>
            ))
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-12">
          <GlassPanel matte className="px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <p className="min-w-0 text-[13px] leading-snug text-white/45 sm:truncate">
                <span className="font-display font-black uppercase tracking-tight text-white/75">
                  {faq.contactTitle}
                </span>
                <span className="text-white/30"> · </span>
                {faq.contactBody}
              </p>
              <a
                href={faq.contactHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(REGISTER_CTA_CLASS, "shrink-0 self-start sm:self-center")}
              >
                {faq.contactCta}
                <span className="normal-case tracking-normal">{SOCIAL_TG_HANDLE}</span>
              </a>
            </div>
          </GlassPanel>
        </div>

      </main>

      <AnimatePresence>
        {showBackToTop ? (
          <motion.button
            key="back-to-top"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            aria-label={faq.backToTop}
            className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#121110]/90 text-white/55 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
