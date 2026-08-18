import Image from "next/image";

/**
 * Form8 · silhouette research
 * One thesis: solid mass + ownable twist. Sense = form/kit + place in XI.
 */

const ASSETS = "/design-lab/form8-logo/silhouette";

const PRIMARY = [
  {
    id: "jersey",
    name: "Jersey · 8",
    sense: "форма + 8 — найпряміший нормальний лого з сенсом",
    file: "gen-jersey.png",
    vector: "b-jersey-8-on-black.png",
  },
  {
    id: "slot",
    name: "Empty slot",
    sense: "порожнє місце в складі, яке ти заповнюєш",
    file: "gen-slot.png",
    vector: "a-empty-slot-on-black.png",
  },
  {
    id: "athlete",
    name: "Athlete silhouette",
    sense: "спортивний силует (NBA-craft) — потрібен twist з 8",
    file: "gen-athlete.png",
    vector: "c-athlete-on-black.png",
  },
] as const;

const SUPPORT = [
  { id: "d", name: "Slash mass", file: "d-slash-mass-on-black.png", note: "маса + розріз" },
  { id: "e", name: "Eight + slot", file: "e-eight-slot-on-black.png", note: "8 + порожній слот" },
  { id: "f", name: "Blob + slot", file: "f-blob-slot-on-black.png", note: "м’яка маса + слот" },
] as const;

export function Form8LogoLab() {
  return (
    <main className="min-h-screen bg-neutral-200 text-neutral-900">
      <header className="border-b border-neutral-300 px-6 py-9 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Form8 · research → silhouette
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
          Мінімалістичний силует зі смислом
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Не F8-монограма. Один силует + один twist. Смисл продукту:
          формування складу / форма / місце в XI.
        </p>
      </header>

      <section className="border-b border-neutral-300 px-6 py-8 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          research lock
        </p>
        <ul className="mt-4 max-w-3xl space-y-2 text-sm leading-relaxed text-neutral-700">
          <li>
            <span className="font-medium text-neutral-900">2026 trend:</span> Simple
            Twist — один чистий силует + один ownable cut (VistaPrint / Behance sports).
          </li>
          <li>
            <span className="font-medium text-neutral-900">Sports modern:</span> flat
            bold mass, 1–2 кольори, читається як favicon. Не crest-ілюстрація.
          </li>
          <li>
            <span className="font-medium text-neutral-900">Dual-read:</span> ATP /
            negative-space sports — другий read = сенс продукту.
          </li>
          <li>
            <span className="font-medium text-neutral-900">Football apps:</span> CLUB,
            FC.APP — геометричний icon-first, не схема поля.
          </li>
          <li>
            <span className="font-medium text-neutral-900">Kill list:</span> pitch /
            11 dots / м’яч / toilet-stickman / модульний F без сенсу.
          </li>
        </ul>
      </section>

      <section className="border-b border-neutral-300 px-6 py-8 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          primary · pick one
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
          Три напрями. Рекомендація: Jersey · 8
        </h2>
      </section>

      <section className="grid gap-px bg-neutral-300 lg:grid-cols-3">
        {PRIMARY.map((p) => (
          <article key={p.id} className="bg-neutral-100">
            <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              {p.name}
            </p>
            <div className="relative aspect-square bg-neutral-950">
              <Image
                src={`${ASSETS}/${p.file}`}
                alt={p.name}
                fill
                className="object-contain"
                sizes="33vw"
                priority
              />
            </div>
            <div className="relative aspect-square bg-neutral-950">
              <Image
                src={`${ASSETS}/${p.vector}`}
                alt={`${p.name} vector`}
                fill
                className="object-contain"
                sizes="33vw"
              />
            </div>
            <p className="px-4 py-3 text-sm text-neutral-600">{p.sense}</p>
          </article>
        ))}
      </section>

      <section className="border-b border-neutral-300 px-6 py-8 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          support · same thesis
        </p>
      </section>

      <section className="grid gap-px bg-neutral-300 sm:grid-cols-3">
        {SUPPORT.map((s) => (
          <article key={s.id} className="bg-neutral-100">
            <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              {s.name}
            </p>
            <div className="relative aspect-square bg-neutral-950">
              <Image
                src={`${ASSETS}/${s.file}`}
                alt={s.name}
                fill
                className="object-contain"
                sizes="33vw"
              />
            </div>
            <p className="px-4 py-3 text-sm text-neutral-600">{s.note}</p>
          </article>
        ))}
      </section>

      <section className="px-6 py-9 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          next
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Напиши який напрям: <span className="text-neutral-900">jersey / slot /
          athlete</span> — зроблю ювелірку (SVG lockup + navbar) тільки по ньому.
        </p>
      </section>
    </main>
  );
}
