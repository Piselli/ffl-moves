"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type LayoutId = "1" | "2" | "3" | "4" | "5" | "6";

const LAYOUTS: {
  id: LayoutId;
  title: string;
  tag: string;
  note: string;
  recommended?: boolean;
  current?: boolean;
}[] = [
  {
    id: "1",
    title: "3D hero card",
    tag: "Картка без панелі · tilt · Download + Copy",
    note: "Shipping default. Картка в повітрі, рухається від курсора.",
    current: true,
  },
  {
    id: "2",
    title: "Poster first",
    tag: "Постер зверху, заголовок під ним",
    note: "Одразу бачиш картку. Краще для OG-preview mindset.",
    recommended: true,
  },
  {
    id: "3",
    title: "Actions sidebar",
    tag: "Постер ліворуч · кнопки праворуч",
    note: "На desktop виглядає преміум. На mobile стекається.",
  },
  {
    id: "4",
    title: "Single action",
    tag: "Тільки Copy + X закрити",
    note: "Copy motion: Focus — центральний check + dim, кнопка інвертується в чорну.",
  },
  {
    id: "5",
    title: "Sticky footer bar",
    tag: "Постер скролиться · кнопка прилипає",
    note: "CTA завжди в полі зору на маленьких екранах.",
  },
  {
    id: "6",
    title: "Bottom sheet",
    tag: "Знизу виїжджає · drag handle",
    note: "Copy motion: Rail — смуга знизу постера + ripple на кнопці.",
  },
];

function PosterThumb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-white/10 bg-black",
        className,
      )}
    >
      <div className="flex h-full">
        <div className="w-[28%] border-r border-white/8 p-1">
          <div className="h-1.5 w-8 rounded bg-white/30" />
          <div className="mt-2 h-2 w-full rounded bg-white/20" />
          <div className="mt-auto pt-4 text-[5px] text-white/25">4-3-3</div>
        </div>
        <div className="flex-1 bg-emerald-950/40 p-1">
          <div className="grid h-full grid-cols-3 place-items-center gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-px">
                <div className="h-2 w-2 rounded-full bg-white/25" />
                <div className="h-0.5 w-3 rounded-sm bg-white/70" />
              </div>
            ))}
          </div>
        </div>
        <div className="w-[22%] border-l border-white/8 p-1">
          <div className="space-y-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-0.5 rounded bg-white/15" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Btn({
  primary,
  children,
  className,
}: {
  primary?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md px-2 py-1 text-center text-[6px] font-black uppercase tracking-wide",
        primary
          ? "bg-white text-black"
          : "border border-white/15 text-white/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ModalMock({ id }: { id: LayoutId }) {
  const shell =
    "relative mx-auto flex flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0c0c0e] p-2 shadow-2xl";

  if (id === "1") {
    return (
      <div className={cn(shell, "h-[200px] w-full max-w-[220px]")}>
        <div className="mb-1.5 flex justify-between">
          <div>
            <div className="text-[5px] font-mono uppercase text-[#00f948]/70">
              Squad locked
            </div>
            <div className="text-[8px] font-black uppercase text-white">
              Copy poster
            </div>
          </div>
          <div className="text-[8px] text-white/30">×</div>
        </div>
        <PosterThumb className="mb-1.5 min-h-0 flex-1" />
        <div className="grid grid-cols-2 gap-1">
          <Btn>Later</Btn>
          <Btn primary>
            Copy
          </Btn>
        </div>
      </div>
    );
  }

  if (id === "2") {
    return (
      <div className={cn(shell, "h-[200px] w-full max-w-[220px]")}>
        <div className="mb-1 flex justify-end text-[8px] text-white/30">×</div>
        <PosterThumb className="mb-1.5 min-h-0 flex-[1.2]" />
        <div className="mb-1.5 text-center">
          <div className="text-[5px] font-mono uppercase text-[#00f948]/70">
            Squad locked
          </div>
          <div className="text-[8px] font-black uppercase text-white">
            Copy poster
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Btn>Later</Btn>
          <Btn primary>
            Copy
          </Btn>
        </div>
      </div>
    );
  }

  if (id === "3") {
    return (
      <div className={cn(shell, "h-[200px] w-full max-w-[260px]")}>
        <div className="mb-1 flex justify-end text-[8px] text-white/30">×</div>
        <div className="flex min-h-0 flex-1 gap-2">
          <PosterThumb className="min-w-0 flex-[1.4]" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            <div className="text-[5px] font-mono uppercase text-[#00f948]/70">
              Squad locked
            </div>
            <div className="text-[7px] font-black uppercase leading-tight text-white">
              Copy poster
            </div>
            <Btn primary className="mt-1">
              Copy image
            </Btn>
            <Btn>Later</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (id === "4") {
    return (
      <div className={cn(shell, "h-[200px] w-full max-w-[220px]")}>
        <div className="mb-1.5 flex items-start justify-between">
          <div className="text-[8px] font-black uppercase text-white">
            Copy poster
          </div>
          <div className="text-[8px] text-white/30">×</div>
        </div>
        <PosterThumb className="mb-2 min-h-0 flex-1" />
        <Btn primary className="w-full py-1.5 text-[7px]">
          Copy image
        </Btn>
      </div>
    );
  }

  if (id === "5") {
    return (
      <div className={cn(shell, "h-[200px] w-full max-w-[220px] p-0")}>
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-[7px] font-black uppercase text-white">
            Copy poster
          </div>
          <div className="text-[8px] text-white/30">×</div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-2 py-1">
          <PosterThumb className="h-full" />
        </div>
        <div className="border-t border-white/10 bg-black/60 p-2 backdrop-blur-sm">
          <div className="grid grid-cols-[1fr_1.4fr] gap-1">
            <Btn>Later</Btn>
            <Btn primary>
              Copy
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <div className="absolute inset-0 rounded-xl bg-black/50" />
      <div
        className={cn(
          shell,
          "relative mt-8 h-[168px] rounded-t-2xl rounded-b-xl border-b-0",
        )}
      >
        <div className="mx-auto mb-1.5 h-1 w-8 rounded-full bg-white/20" />
        <div className="mb-1 text-center text-[7px] font-black uppercase text-white">
          Copy poster
        </div>
        <PosterThumb className="mb-1.5 min-h-0 flex-1" />
        <Btn primary className="w-full py-1.5 text-[7px]">
          Copy image
        </Btn>
      </div>
    </div>
  );
}

export default function ShareModalLayoutsPage() {
  return (
    <div className="min-h-screen bg-[#050506] pb-20 text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050506]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#00f948]/75">
              Form8 · Modal layouts
            </p>
            <h1 className="mt-0.5 font-display text-lg font-black uppercase tracking-wide">
              6 варіантів модалки
            </h1>
            <p className="mt-1 max-w-xl text-[12px] text-white/40">
              Розташування постера, заголовка і кнопок. Напиши номер — впроваджу в
              продукт.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/design-lab/share-modal-4"
              className="rounded-lg bg-white px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-wider text-black"
            >
              Live · 4
            </Link>
            <Link
              href="/design-lab/share-modal-6"
              className="rounded-lg border border-white/15 px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-wider text-white/80"
            >
              Live · 6
            </Link>
            <Link
              href="/design-lab/locker-hero?preview=registered"
              className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50"
            >
              Locker CTA
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LAYOUTS.map((layout) => (
            <article
              key={layout.id}
              className={cn(
                "rounded-2xl border p-4",
                layout.recommended
                  ? "border-[#00f948]/30 bg-[#00f948]/[0.04]"
                  : "border-white/[0.08] bg-white/[0.02]",
              )}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-white/35">
                  {layout.id}
                </span>
                <h2 className="font-display text-sm font-black uppercase tracking-wide">
                  {layout.title}
                </h2>
                {layout.current ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-white/55">
                    зараз
                  </span>
                ) : null}
                {layout.recommended ? (
                  <span className="rounded-full bg-[#00f948]/15 px-2 py-0.5 text-[9px] font-bold uppercase text-[#00f948]">
                    топ
                  </span>
                ) : null}
              </div>
              <p className="mb-4 text-[11px] text-white/40">{layout.tag}</p>
              <div className="flex min-h-[210px] items-end justify-center pb-2">
                <ModalMock id={layout.id} />
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-white/50">
                {layout.note}
                {layout.id === "4" ? (
                  <>
                    {" "}
                    <Link
                      href="/design-lab/share-modal-4"
                      className="font-semibold text-white/75 underline-offset-2 hover:underline"
                    >
                      Відкрити live →
                    </Link>
                  </>
                ) : null}
                {layout.id === "6" ? (
                  <>
                    {" "}
                    <Link
                      href="/design-lab/share-modal-6"
                      className="font-semibold text-white/75 underline-offset-2 hover:underline"
                    >
                      Відкрити live →
                    </Link>
                  </>
                ) : null}
              </p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
