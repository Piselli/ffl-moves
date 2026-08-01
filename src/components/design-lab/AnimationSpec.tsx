"use client";

export function AnimationSpec({
  reference,
  title,
  items,
}: {
  reference: string;
  title: string;
  items: { label: string; detail: string }[];
}) {
  return (
    <aside className="mt-6 rounded border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/90">
        Animation spec · {reference}
      </p>
      <h4 className="mt-1 text-sm font-semibold text-white/90">{title}</h4>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="text-sm leading-relaxed text-white/55">
            <span className="font-mono text-[11px] text-amber-200/80">{item.label}</span>
            <span className="text-white/40"> — </span>
            {item.detail}
          </li>
        ))}
      </ul>
    </aside>
  );
}
