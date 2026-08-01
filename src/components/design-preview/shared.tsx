/** Shared duotone green ink on photo */
export function DuotonePhoto({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#1a1917] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover object-top grayscale contrast-[1.15] brightness-[0.85]" />
      ) : (
        <div className="flex h-full w-full items-end justify-center bg-gradient-to-t from-[#1a1917] to-[#3d3a36]">
          <span className="pb-4 font-mono text-[10px] uppercase tracking-widest text-white/20">Portrait</span>
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-color"
        style={{ backgroundColor: "#00f948" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[#2a2826]/25 mix-blend-multiply" aria-hidden />
    </div>
  );
}

export const ISSUE = {
  bg: "#2a2826",
  ink: "#f2efe8",
  muted: "rgba(242,239,232,0.45)",
  accent: "#00f948",
  stone: "#3d3a36",
};
