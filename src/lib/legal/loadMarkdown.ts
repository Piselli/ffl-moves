import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  applyLegalPlaceholders,
  type LegalSlug,
} from "@/lib/legal/config";

export type LegalFileLocale = "en" | "uk";

export function siteLocaleToLegalFile(locale: string): LegalFileLocale {
  return locale === "uk" || locale === "ua" ? "uk" : "en";
}

export function loadLegalMarkdown(
  slug: LegalSlug,
  locale: string,
): { markdown: string; fileLocale: LegalFileLocale } {
  const preferred = siteLocaleToLegalFile(locale);
  const dir = path.join(process.cwd(), "content", "legal");
  const preferredPath = path.join(dir, `${slug}.${preferred}.md`);
  const enPath = path.join(dir, `${slug}.en.md`);

  let fileLocale: LegalFileLocale = preferred;
  let raw: string;
  if (existsSync(preferredPath)) {
    raw = readFileSync(preferredPath, "utf8");
  } else if (existsSync(enPath)) {
    raw = readFileSync(enPath, "utf8");
    fileLocale = "en";
  } else {
    throw new Error(`Missing legal markdown for ${slug}`);
  }

  return { markdown: applyLegalPlaceholders(raw), fileLocale };
}
