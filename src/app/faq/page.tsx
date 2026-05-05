"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { FaqAnswerBlock, FaqCategory, FaqCategoryId, FaqItem } from "@/i18n/pages";

// ─── Category icons (small inline SVGs — match the site’s look) ──────────────
function CategoryIcon({ id, className }: { id: FaqCategoryId; className?: string }) {
  const cls = `w-5 h-5 ${className ?? ""}`;
  switch (id) {
    case "what-is-this":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" strokeLinecap="round" />
          <circle cx="12" cy="17" r="0.6" fill="currentColor" />
        </svg>
      );
    case "football-101":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3l3 3-1 4-4 1-3-3 1-4 4-1Z" />
          <path d="M12 12l3 3M12 12l-3 3M12 12l3-3M12 12l-3-3" />
        </svg>
      );
    case "web3-101":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M3 10h18" />
          <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case "how-to-play":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path d="M9 5l9 7-9 7V5Z" strokeLinejoin="round" />
        </svg>
      );
    case "scoring-and-rewards":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
          <path d="M12 3l2.6 5.5 6 .9-4.4 4.2 1 6L12 16.8 6.8 19.6l1-6L3.4 9.4l6-.9L12 3Z" strokeLinejoin="round" />
        </svg>
      );
    case "trust-and-safety":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3Z" strokeLinejoin="round" />
          <path d="M9.5 12l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "whats-next":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

// ─── Single answer block (paragraph or bullet list) ──────────────────────────
function AnswerBlock({ block }: { block: FaqAnswerBlock }) {
  if (block.type === "p") {
    return <p className="text-white/65 leading-relaxed text-[15px]">{block.text}</p>;
  }
  return (
    <ul className="space-y-2">
      {block.items.map((it, i) => (
        <li key={i} className="flex items-start gap-3 text-white/65 leading-relaxed text-[15px]">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#00f948] shrink-0 shadow-[0_0_6px_rgba(0,249,72,0.7)]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── One Q&A row (collapsible) ───────────────────────────────────────────────
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
  const anchorId = `${catId}--${item.id}`;
  return (
    <div
      id={anchorId}
      className={`group rounded-xl border transition-colors duration-200 ${
        isOpen
          ? "border-[#00f948]/25 bg-[#00f948]/[0.03]"
          : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.14] hover:bg-white/[0.03]"
      }`}
      style={{ scrollMarginTop: "100px" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[15px] sm:text-base font-semibold text-white/90 leading-snug">{item.q}</span>
        <span
          className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-200 ${
            isOpen
              ? "bg-[#00f948]/15 border-[#00f948]/40 text-[#00f948] rotate-180"
              : "bg-white/[0.04] border-white/10 text-white/50 group-hover:text-white/80"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/[0.05]">
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

// ─── Helper: search match on q + flattened answer text ───────────────────────
function flattenAnswerText(blocks: FaqAnswerBlock[]): string {
  return blocks
    .map((b) => (b.type === "p" ? b.text : b.items.join(" ")))
    .join(" ")
    .toLowerCase();
}

export default function FaqPage() {
  const m = useSiteMessages();
  const faq = m.pages.faq;

  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);

  // ── Build lowercased search index once per locale ────────────────────────
  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of faq.categories) {
      for (const it of cat.items) {
        map.set(`${cat.id}--${it.id}`, `${it.q.toLowerCase()} ${flattenAnswerText(it.a)}`);
      }
    }
    return map;
  }, [faq]);

  // ── Filter by search ─────────────────────────────────────────────────────
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

  // ── On load: open the first item of the first category, plus deep-linked one ─
  useEffect(() => {
    if (allItemKeys.length === 0) return;
    const initial = new Set<string>();
    initial.add(allItemKeys[0]);

    if (typeof window !== "undefined" && window.location.hash) {
      const hashKey = window.location.hash.replace(/^#/, "");
      if (allItemKeys.includes(hashKey)) {
        initial.add(hashKey);
        // Defer scroll so the accordion has time to mount
        setTimeout(() => {
          document.getElementById(hashKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    }
    setOpenIds(initial);
  }, [allItemKeys]);

  // ── Floating "back to top" button visibility ─────────────────────────────
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-[#0D0F12] min-h-screen text-white">
      {/* Ambient glows */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(139,92,246,0.07)_0%,transparent_55%)] pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(0,249,72,0.04)_0%,transparent_55%)] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 pt-28 sm:pt-32 pb-20">

        {/* ─── Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f948]/10 border border-[#00f948]/25 text-[#00f948] text-[10px] font-bold uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f948] shadow-[0_0_6px_rgba(0,249,72,0.8)]" />
            {faq.eyebrow}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black uppercase tracking-tight leading-[1.05] text-white mb-4">
            {faq.title}
          </h1>
          <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-2xl">{faq.subtitle}</p>
        </motion.div>

        {/* ─── Search + bulk toggle ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        >
          <div className="relative flex-1 max-w-xl">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none"
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
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 pl-11 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00f948]/40 focus:bg-white/[0.05] transition-colors"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={faq.clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (allVisibleOpen ? collapseAll() : expandAll())}
              disabled={visibleItemKeys.length === 0}
              className="px-3 py-2 rounded-lg text-[11px] font-display font-bold uppercase tracking-wider border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {allVisibleOpen ? faq.collapseAll : faq.expandAll}
            </button>
          </div>
        </motion.div>

        {/* ─── Search summary ────────────────────────────────────────── */}
        {query.trim() ? (
          <p className="text-xs text-white/40 mb-6">{faq.foundCount(totalMatches)}</p>
        ) : null}

        {/* ─── Category navigation pills (anchor jumps) ───────────────── */}
        {!query.trim() ? (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            aria-label="FAQ categories"
            className="mb-10 flex flex-wrap gap-2"
          >
            {faq.categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-widest text-white/55 hover:text-white hover:border-[#00f948]/40 hover:bg-[#00f948]/[0.05] transition-colors"
              >
                <CategoryIcon id={cat.id} className="text-white/45" />
                <span>{cat.title}</span>
              </a>
            ))}
          </motion.nav>
        ) : null}

        {/* ─── Categories ─────────────────────────────────────────────── */}
        <div className="space-y-12">
          {filteredCategories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-base font-display font-bold text-white/80 mb-1">{faq.noResultsTitle}</p>
              <p className="text-sm text-white/45 max-w-md mx-auto mb-4">{faq.noResultsHint}</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-display font-bold uppercase tracking-wider border border-[#00f948]/30 text-[#00f948] bg-[#00f948]/10 hover:bg-[#00f948]/20 transition-colors"
              >
                {faq.clearSearch}
              </button>
            </motion.div>
          ) : (
            filteredCategories.map((cat, ci) => (
              <motion.section
                key={cat.id}
                id={`cat-${cat.id}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: Math.min(ci * 0.04, 0.16), ease: [0.22, 1, 0.36, 1] }}
                style={{ scrollMarginTop: "100px" }}
              >
                <header className="mb-5 flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl border border-[#00f948]/25 bg-[#00f948]/[0.06] text-[#00f948] flex items-center justify-center mt-0.5">
                    <CategoryIcon id={cat.id} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-white leading-tight">
                      {cat.title}
                    </h2>
                    <p className="text-sm text-white/40 mt-1">{cat.blurb}</p>
                  </div>
                </header>

                <div className="space-y-2.5">
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
              </motion.section>
            ))
          )}
        </div>

        {/* ─── Contact CTA ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-16 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-7 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8"
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight mb-2">
              {faq.contactTitle}
            </h3>
            <p className="text-sm text-white/50 leading-relaxed max-w-xl">{faq.contactBody}</p>
          </div>
          <a
            href={faq.contactHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-display font-black uppercase tracking-widest text-sm bg-[#00f948] text-black hover:brightness-110 transition-all shadow-[0_0_24px_rgba(0,249,72,0.25)] shrink-0"
          >
            {faq.contactCta}
            {/* X (Twitter) logo */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
            </svg>
          </a>
        </motion.div>

        {/* Quick link back home */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest font-bold"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            MOVEMATCH
          </Link>
        </div>
      </div>

      {/* ─── Floating "back to top" button ──────────────────────────── */}
      <AnimatePresence>
        {showBackToTop ? (
          <motion.button
            key="back-to-top"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            aria-label={faq.backToTop}
            className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-[#0D0F12]/90 backdrop-blur-xl border border-white/15 text-white/70 hover:text-[#00f948] hover:border-[#00f948]/40 shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
