"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Form8Mark, Form8Wordmark } from "@/components/Form8Mark";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#", label: "Play" },
  { href: "#", label: "Leaderboard" },
  { href: "#", label: "Fixtures" },
  { href: "#", label: "World Cup", accent: true },
] as const;

/**
 * Interactive mock of homepage IA + nav with locker-style hero.
 * Lab only — does not touch prod `/`.
 */
export function HomepageNavRedesign() {
  const [scrolled, setScrolled] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-[#0a0b0d] text-white">
      {/* Lab chrome */}
      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-black/75 px-3 py-2 shadow-2xl backdrop-blur-xl">
        <Link
          href="/design-preview"
          className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-white"
        >
          ← Concepts
        </Link>
        <span className="h-3 w-px bg-white/15" />
        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#00f948]/90 hover:text-[#00f948]"
        >
          {showNotes ? "Hide notes" : "Show notes"}
        </button>
        <span className="h-3 w-px bg-white/15" />
        <span className="px-1 font-mono text-[10px] text-white/35">
          Scroll to see nav expand
        </span>
      </div>

      {/* Proposed nav */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background,border,backdrop-filter,padding] duration-300",
          scrolled
            ? "border-b border-white/[0.08] bg-[#0a0b0d]/75 py-0 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent py-0",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 transition-[height] duration-300 sm:px-6",
            scrolled && "h-12 sm:h-14",
          )}
        >
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              {scrolled ? (
                <>
                  <Form8Mark className="h-7" />
                  <Form8Wordmark className="hidden text-sm sm:inline" />
                </>
              ) : (
                <Form8Mark className="h-8" />
              )}
            </Link>

            <nav
              className={cn(
                "hidden items-center gap-1 transition-all duration-300 md:flex",
                scrolled
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0",
              )}
              aria-hidden={!scrolled}
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    "accent" in link && link.accent
                      ? "text-[#00f948]"
                      : "text-white/55 hover:text-white",
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-white/40 sm:inline">
              EN
            </span>
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors active:scale-[0.98]",
                scrolled
                  ? "bg-[#00f948] text-black hover:bg-[#00f948]/90"
                  : "border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/15",
              )}
            >
              Connect
            </button>
          </div>
        </div>

        {showNotes && !scrolled && (
          <p className="pointer-events-none absolute left-4 top-[3.25rem] max-w-[14rem] font-mono text-[9px] leading-snug uppercase tracking-wider text-[#00f948]/70 sm:left-6">
            Over hero: mark + Connect only. Links hidden.
          </p>
        )}
        {showNotes && scrolled && (
          <p className="pointer-events-none absolute left-4 top-[3.4rem] max-w-[16rem] font-mono text-[9px] leading-snug uppercase tracking-wider text-[#00f948]/70 sm:left-6">
            On scroll: full primary nav (4 links max).
          </p>
        )}
      </header>

      {/* Hero */}
      <section className="relative min-h-[100dvh] overflow-hidden">
        <Image
          src="/design-lab/locker-hero/variants/locker-plate-v1-walnut-clean.png"
          alt=""
          fill
          priority
          className="object-cover object-[center_35%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-[#0a0b0d]/35 to-black/50"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_20%,rgba(10,11,13,0.55)_100%)]"
          aria-hidden
        />

        {/* Cast hints */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[18%] flex justify-center gap-3 opacity-40 sm:gap-6">
          {["haaland", "palmer", "son", "bruno"].map((id) => (
            <div
              key={id}
              className="relative h-28 w-16 overflow-hidden rounded-t-md sm:h-40 sm:w-24"
            >
              <Image
                src={`/design-lab/locker-hero/cast/${id}.png`}
                alt=""
                fill
                className="object-cover object-top"
                sizes="96px"
              />
            </div>
          ))}
        </div>

        {/* Tablet product */}
        <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 pb-16 pt-20 sm:px-6">
          <div className="relative w-full max-w-[420px] sm:max-w-[520px]">
            {showNotes && (
              <p className="mb-3 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">
                Brand + CTA live inside the product · not in a marketing stack
              </p>
            )}
            <div className="rounded-[1.75rem] border border-white/20 bg-[#1a1c1f] p-2.5 shadow-[0_40px_100px_rgba(0,0,0,0.65)] sm:rounded-[2rem] sm:p-3">
              <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0d0f12] sm:rounded-[1.5rem]">
                {/* Tablet chrome */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Form8Mark className="h-6" />
                    <div>
                      <p className="font-display text-[13px] font-bold uppercase tracking-tight text-white">
                        Pick your team
                      </p>
                      <p className="text-[10px] text-white/40">
                        FORM8 Fantasy EPL
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[9px] text-white/45">
                    GW 28
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_0.85fr] gap-0">
                  <div className="relative aspect-[4/5] border-r border-white/[0.06]">
                    <Image
                      src="/design-lab/locker-hero/pitch-turf-flat.jpg"
                      alt=""
                      fill
                      className="object-cover opacity-80"
                      sizes="280px"
                    />
                    <div className="absolute inset-0 bg-[#0d0f12]/35" />
                    <div className="absolute inset-3 grid grid-rows-4 gap-1.5 opacity-80">
                      {[3, 4, 3, 1].map((n, row) => (
                        <div key={row} className="flex items-center justify-center gap-1.5">
                          {Array.from({ length: n }).map((_, i) => (
                            <span
                              key={i}
                              className="h-5 w-5 rounded-full border border-white/25 bg-black/40 sm:h-6 sm:w-6"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 p-3">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-white/35">
                      Available
                    </p>
                    {["Haaland", "Palmer", "Salah", "Isak"].map((name) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1.5"
                      >
                        <span className="text-[11px] font-medium text-white/80">
                          {name}
                        </span>
                        <span className="font-mono text-[9px] text-[#00f948]/80">
                          +
                        </span>
                      </div>
                    ))}
                    <div className="mt-auto space-y-2 pt-2">
                      <p className="text-[10px] text-white/40">
                        Prize pool · 1,240 USDCx
                      </p>
                      <button
                        type="button"
                        className="w-full rounded-lg bg-[#00f948] py-2.5 text-center font-display text-[12px] font-bold uppercase tracking-wide text-black active:scale-[0.98]"
                      >
                        Play gameweek
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Below-fold */}
      <section className="relative z-10 border-t border-white/[0.06] bg-[#0a0b0d]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <p className="text-sm text-white/50">
            <span className="text-white/80">1,240 USDCx</span>
            {" · "}
            Entry 2 MOVE
            {" · "}
            Locks Sat 12:30 UTC
          </p>
          {showNotes && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#00f948]/60">
              Trust strip under hero · not inside it
            </span>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-xl">
          <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-base text-white/45">
            Three steps. No second 3D scene competing with the locker.
          </p>
          {showNotes && (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-[#00f948]/55">
              Compress current how-it-works · drop giant visuals
            </p>
          )}
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            ["Pick 11", "Build from the live EPL board before lock."],
            ["Match days", "Points from real minutes, goals, and bonuses."],
            ["Cash out", "Top 10 split the on-chain prize pool."],
          ].map(([title, body]) => (
            <div key={title} className="border-t border-white/10 pt-5">
              <h3 className="font-display text-lg font-bold uppercase tracking-tight">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/45">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#0d0f12]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-16">
          <div className="max-w-md">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Scoring
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/45">
              Goals, cleans, saves, rating bonuses. Full breakdown lives in FAQ.
            </p>
            {showNotes && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-[#00f948]/55">
                Teaser only · full GK/DEF grid → FAQ
              </p>
            )}
          </div>
          <a
            href="/faq"
            className="shrink-0 text-sm font-medium text-[#00f948] hover:underline"
          >
            See scoring rules →
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#12151a] to-[#0a0b0d] p-6 sm:p-8">
          <div
            className="absolute right-0 top-0 flex h-full w-24 opacity-80 sm:w-32"
            aria-hidden
          >
            <span className="w-1/3 bg-[#BF0A30]/80" />
            <span className="w-1/3 bg-white/90" />
            <span className="w-1/3 bg-[#002868]/90" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Also live
          </p>
          <h2 className="mt-2 max-w-lg font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            World Cup 2026
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/45">
            Same FORM8 loop on the tournament. One block — not a second full
            hero carousel.
          </p>
          <a
            href="/world-cup"
            className="mt-6 inline-flex rounded-lg bg-[#00f948] px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-black active:scale-[0.98]"
          >
            Open World Cup
          </a>
          {showNotes && (
            <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-[#00f948]/55">
              Replaces HomeHeroCarousel dual-hero
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Ready for kickoff?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/45">
          Same CTA intent as the tablet. One label everywhere.
        </p>
        <button
          type="button"
          className="mt-8 rounded-lg bg-[#00f948] px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-black active:scale-[0.98]"
        >
          Play gameweek
        </button>
      </section>

      <footer className="border-t border-white/[0.06] bg-[#08090b]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Form8Mark className="h-7" />
              <Form8Wordmark className="text-sm tracking-wider text-white/70" />
            </div>
            <p className="mt-1 max-w-sm text-sm text-white/35">
              Premier League fantasy on Movement.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/45">
            <a href="/faq" className="hover:text-white">
              FAQ
            </a>
            <a href="/season-leaderboard" className="hover:text-white">
              Season SP
            </a>
            <a href="https://x.com/MoveMatchxyz" className="hover:text-white">
              X
            </a>
          </div>
        </div>
        {showNotes && (
          <p className="pb-8 text-center font-mono text-[9px] uppercase tracking-wider text-[#00f948]/45">
            Footer returns on homepage · secondary links live here
          </p>
        )}
      </footer>
    </div>
  );
}
