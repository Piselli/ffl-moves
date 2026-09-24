"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { LOCKER_CTA, SHARE_SQUAD_CTA_STYLE } from "@/components/design-lab/locker-hero/ctaStyles";
import { cn } from "@/lib/utils";

type VariantId = "A" | "B" | "C" | "D";

const BTN =
  "inline-flex h-8 items-center justify-center rounded-lg px-3 font-display text-[11px] font-black uppercase leading-none tracking-wide";

function XBtn() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-black/40 text-white/70">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
      </svg>
    </span>
  );
}

function OutBtn() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-black/40 text-white/45">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1M3 12h11M10 8l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Nick({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-8 items-center gap-1.5 px-2", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-[#00f948] shadow-[0_0_6px_rgba(0,249,72,0.8)]" />
      <span className="font-display text-[11px] font-black uppercase tracking-wider text-white/85">
        7XySQo…8bYi
      </span>
    </span>
  );
}

function BalanceText() {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 px-2">
      <span className="font-display text-[13px] font-black leading-none tracking-tight text-white">
        5.00
      </span>
      <span className="font-display text-[10px] font-black uppercase leading-none tracking-[0.1em] text-white/45">
        USDC
      </span>
    </span>
  );
}

function BalanceWhite() {
  return (
    <span
      className={cn(BTN, "gap-1.5 normal-case tracking-normal")}
      style={SHARE_SQUAD_CTA_STYLE}
    >
      <span className="font-display text-[12px] font-black leading-none tracking-tight text-[#08090a]">
        5.00
      </span>
      <span className="font-display text-[10px] font-black uppercase leading-none tracking-[0.08em] text-[#08090a]/50">
        USDC
      </span>
    </span>
  );
}

function DepositGreen({ style }: { style?: CSSProperties }) {
  return (
    <span className={BTN} style={style ?? LOCKER_CTA.style}>
      Deposit
    </span>
  );
}

function DepositWhite() {
  return (
    <span className={BTN} style={SHARE_SQUAD_CTA_STYLE}>
      Deposit
    </span>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-2.5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <XBtn />
      {children}
      <OutBtn />
    </div>
  );
}

const VARIANTS: Array<{
  id: VariantId;
  name: string;
  hook: string;
  note: string;
  render: () => ReactNode;
}> = [
  {
    id: "A",
    name: "Flat + register green",
    hook: "Без підкладки · Deposit = convex-green як реєстрація",
    note: "Найпростіше. Баланс текстом, зелений купол як на планшеті. Не кліпає.",
    render: () => (
      <Frame>
        <div className="inline-flex items-center gap-1.5">
          <BalanceText />
          <DepositGreen />
          <Nick />
        </div>
      </Frame>
    ),
  },
  {
    id: "B",
    name: "White balance · green deposit",
    hook: "Баланс білою кісткою · Deposit register-green",
    note: "Дві чіткі кнопки: біла = стан, зелена = дія. Без зовнішнього tray.",
    render: () => (
      <Frame>
        <div className="inline-flex items-center gap-1.5">
          <BalanceWhite />
          <DepositGreen />
          <Nick />
        </div>
      </Frame>
    ),
  },
  {
    id: "C",
    name: "Soft tray · airy pad",
    hook: "М’яка підкладка з нормальним padding · без кліпу",
    note: "Tray h-11 / inner h-8 / p-1.5. Кути xl→lg. Зелений deposit всередині.",
    render: () => (
      <Frame>
        <div className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-black/40 px-1.5 py-1.5">
          <BalanceText />
          <DepositGreen />
          <Nick />
        </div>
      </Frame>
    ),
  },
  {
    id: "D",
    name: "White deposit · quiet balance",
    hook: "Deposit білий share-стиль · баланс тихий",
    note: "Зелений лишається лише в live-dot. Deposit як share CTA на планшеті.",
    render: () => (
      <Frame>
        <div className="inline-flex items-center gap-1.5">
          <BalanceText />
          <DepositWhite />
          <Nick />
        </div>
      </Frame>
    ),
  },
];

export default function NavUtilityLabPage() {
  return (
    <div className="min-h-screen bg-[#070807] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,249,72,0.08),transparent_55%),linear-gradient(180deg,#0c100c_0%,#070807_40%)]"
      />
      <header className="relative z-10 border-b border-white/[0.06] bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#00f948]/80">
              FORM8 · Design Lab
            </p>
            <h1 className="mt-0.5 text-lg font-medium">Nav utility — balance / deposit / wallet</h1>
          </div>
          <Link
            href="/design-lab"
            className="rounded-sm border border-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            ← Lab
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
        <p className="max-w-2xl text-sm leading-relaxed text-white/55">
          Живий навбар тимчасово flat (без tray), щоб нічого не обрізало. Обери варіант тут —
          перенесемо в Navbar / LockerLabNav.
        </p>

        <div className="space-y-8">
          {VARIANTS.map((v) => (
            <section
              key={v.id}
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
                <div>
                  <span className="font-mono text-[10px] text-[#00f948]/70">{v.id}</span>
                  <span className="ml-2 text-sm font-medium text-white/90">{v.name}</span>
                  <p className="mt-0.5 text-xs text-white/45">{v.hook}</p>
                </div>
                <p className="max-w-sm text-right text-[11px] leading-snug text-white/35">{v.note}</p>
              </div>
              <div
                className="flex justify-center px-4 py-10 sm:px-6"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.62)), url(/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.webp)",
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                }}
              >
                {v.render()}
              </div>
            </section>
          ))}
        </div>

        <p className="text-center font-mono text-[11px] text-white/30">
          Напиши A / B / C / D — закатимо в прод-навбар
        </p>
      </main>
    </div>
  );
}
