/** Lightweight shell shown while heavy route chunks load. */
export function PageRouteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#0D0F12]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00f948]" />
        <p className="text-[11px] font-display font-bold uppercase tracking-widest text-white/35">
          Loading…
        </p>
      </div>
    </div>
  );
}
