import type { Metadata } from "next";
import { LegalPage, buildLegalMetadata } from "@/components/legal/legalPageShared";

export const dynamic = "force-static";

export const metadata: Metadata = buildLegalMetadata("privacy");

export default function Page() {
  return <LegalPage slug="privacy" />;
}
