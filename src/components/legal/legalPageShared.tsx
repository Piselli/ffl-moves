import type { Metadata } from "next";
import { LegalPageClient } from "@/components/legal/LegalPageClient";
import { LEGAL_SITE_URL, LEGAL_SLUGS, type LegalSlug } from "@/lib/legal/config";
import { loadLegalMarkdown } from "@/lib/legal/loadMarkdown";

const META: Record<
  LegalSlug,
  { en: { title: string; description: string }; uk: { title: string; description: string } }
> = {
  terms: {
    en: {
      title: "Terms of Service",
      description: "Form8 terms of service for onchain Premier League fantasy contests.",
    },
    uk: {
      title: "Умови користування",
      description: "Умови користування Form8 для фентезі-контестів АПЛ ончейн.",
    },
  },
  privacy: {
    en: {
      title: "Privacy Policy",
      description: "How Form8 collects and uses personal data.",
    },
    uk: {
      title: "Політика конфіденційності",
      description: "Як Form8 збирає та використовує персональні дані.",
    },
  },
  risk: {
    en: {
      title: "Risk Disclosure",
      description: "Risks of playing Form8, including crypto and smart-contract risks.",
    },
    uk: {
      title: "Розкриття ризиків",
      description: "Ризики участі у Form8, зокрема крипто та смартконтракти.",
    },
  },
  cookies: {
    en: {
      title: "Cookie Policy",
      description: "How Form8 uses cookies and similar technologies.",
    },
    uk: {
      title: "Політика cookie",
      description: "Як Form8 використовує cookie та подібні технології.",
    },
  },
};

export function buildLegalMetadata(slug: LegalSlug): Metadata {
  const en = META[slug].en;
  const path = `/${slug}`;
  const ogImage = `${LEGAL_SITE_URL}/opengraph-image`;
  return {
    title: en.title,
    description: en.description,
    alternates: {
      canonical: `${LEGAL_SITE_URL}${path}`,
    },
    openGraph: {
      title: `${en.title} — Form8`,
      description: en.description,
      url: `${LEGAL_SITE_URL}${path}`,
      siteName: "FORM8",
      type: "website",
      locale: "en_US",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "FORM8" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${en.title} — Form8`,
      description: en.description,
      site: "@Form8HQ",
      images: [ogImage],
    },
  };
}

export function LegalPage({ slug }: { slug: LegalSlug }) {
  const en = loadLegalMarkdown(slug, "en").markdown;
  const uk = loadLegalMarkdown(slug, "uk").markdown;
  return <LegalPageClient slug={slug} markdownByLocale={{ en, uk }} />;
}

export function assertLegalSlug(slug: string): asserts slug is LegalSlug {
  if (!(LEGAL_SLUGS as readonly string[]).includes(slug)) {
    throw new Error(`Unknown legal slug: ${slug}`);
  }
}
