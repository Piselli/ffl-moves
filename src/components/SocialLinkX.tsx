import { SOCIAL_X_HANDLE, SOCIAL_X_URL } from "@/lib/constants";

type SocialLinkXProps = {
  ariaLabel: string;
  variant?: "icon" | "inline" | "cluster";
  className?: string;
};

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

export { XLogo };

export function SocialLinkX({ ariaLabel, variant = "icon", className = "" }: SocialLinkXProps) {
  if (variant === "cluster") {
    return (
      <a
        href={SOCIAL_X_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white ${className}`}
      >
        <XLogo className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-105" />
        <span className="hidden lg:inline text-[10px] font-black font-display uppercase tracking-wider text-[#00f948]">
          {SOCIAL_X_HANDLE}
        </span>
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={SOCIAL_X_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-2 text-white/45 hover:text-white/80 transition-colors ${className}`}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <XLogo className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium">{SOCIAL_X_HANDLE}</span>
      </a>
    );
  }

  return (
    <a
      href={SOCIAL_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors ${className}`}
    >
      <XLogo className="h-4 w-4" />
    </a>
  );
}
