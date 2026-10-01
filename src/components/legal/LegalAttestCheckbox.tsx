"use client";

import type { ReactNode } from "react";
import { useSiteLocale } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
};

/** Plain <a> — safe in portals and outside App Router trees. */
function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-white underline decoration-white/30 underline-offset-2 transition hover:decoration-[#00f948]"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}

/**
 * Explicit clickwrap consent. Document links live in the modal's own rows,
 * so only "restricted country" stays inline here.
 */
export function LegalAttestCheckbox({ checked, onChange, className }: Props) {
  const { locale } = useSiteLocale();
  const uk = locale === "uk";

  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-xl border bg-black/35 px-3.5 py-3 text-left transition-colors duration-150",
        checked ? "border-white/40" : "border-white/20 hover:border-white/30",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[#00f948]/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0b0c0e]",
          checked
            ? "border-[#00f948] bg-[#00f948]"
            : "border-white/30 bg-transparent group-hover:border-white/50",
        )}
      >
        <svg
          viewBox="0 0 12 12"
          className={cn(
            "h-3 w-3 text-black transition-opacity",
            checked ? "opacity-100" : "opacity-0",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.2 5 8.6 9.5 3.6" />
        </svg>
      </span>
      <span className="text-[13px] leading-[1.45] text-white/75">
        {uk ? (
          <>
            Мені 18+ (21+ де вимагається, зокрема в Україні), я не в{" "}
            <DocLink href="/terms#3-restricted-jurisdictions">
              обмеженій країні
            </DocLink>{" "}
            і погоджуюсь з документами вище.
          </>
        ) : (
          <>
            I&apos;m 18+ (21+ where required, incl. Ukraine), not in a{" "}
            <DocLink href="/terms#3-restricted-jurisdictions">
              restricted country
            </DocLink>
            , and agree to the documents above.
          </>
        )}
      </span>
    </label>
  );
}
