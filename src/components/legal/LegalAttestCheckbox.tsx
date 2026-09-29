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
      className="text-[#00f948]/90 underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}

export function LegalAttestCheckbox({ checked, onChange, className }: Props) {
  const { locale } = useSiteLocale();
  const uk = locale === "uk";

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-left",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-transparent accent-[#00f948]"
      />
      <span className="text-[11px] font-medium leading-snug text-white/60">
        {uk ? (
          <>
            Мені 18+ (21+ де вимагається, зокрема в Україні), я не в{" "}
            <DocLink href="/terms#3-restricted-jurisdictions">обмеженій країні</DocLink> і
            погоджуюсь з <DocLink href="/terms">Умовами</DocLink>,{" "}
            <DocLink href="/privacy">Політикою конфіденційності</DocLink> та{" "}
            <DocLink href="/risk">Розкриттям ризиків</DocLink>.
          </>
        ) : (
          <>
            I&apos;m 18+ (21+ where required, incl. Ukraine), not in a{" "}
            <DocLink href="/terms#3-restricted-jurisdictions">restricted country</DocLink>, and I
            agree to the <DocLink href="/terms">Terms</DocLink>,{" "}
            <DocLink href="/privacy">Privacy Policy</DocLink> and{" "}
            <DocLink href="/risk">Risk Disclosure</DocLink>.
          </>
        )}
      </span>
    </label>
  );
}
