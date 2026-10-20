import { SOCIAL_TG_ALERTS_URL } from "@/lib/constants";

type SocialLinkTelegramProps = {
  ariaLabel: string;
  /** Tiny NEW mark on the icon — keep off in cramped phone bars. */
  badge?: string | null;
  className?: string;
};

function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.8 3.6c.3-.9-.6-1.6-1.4-1.2L2.3 10.1c-.9.4-.8 1.7.1 2l4.6 1.5 1.8 5.6c.3.8 1.3 1 1.9.4l2.6-2.6 4.6 3.4c.7.5 1.7.1 1.9-.7L21.8 3.6Zm-4.2 3.2-7.7 6.9-.3 3.3-1.4-4.3 9.4-5.9Z" />
    </svg>
  );
}

export function SocialLinkTelegram({
  ariaLabel,
  badge = null,
  className = "",
}: SocialLinkTelegramProps) {
  return (
    <a
      href={SOCIAL_TG_ALERTS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-black/40 text-white/70 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-[background-color,border-color,color,transform] duration-150 hover:border-white/25 hover:bg-white/[0.08] hover:text-white active:scale-[0.97] ${className}`}
    >
      <TelegramLogo className="h-4 w-4" />
      {badge ? (
        <span className="pointer-events-none absolute -left-1 -top-1 rounded-[3px] bg-[#00f948] px-0.5 py-px font-display text-[7px] font-black uppercase leading-none tracking-wide text-black">
          {badge}
        </span>
      ) : null}
    </a>
  );
}
