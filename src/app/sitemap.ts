import type { MetadataRoute } from "next";
import { LEGAL_SITE_URL, LEGAL_SLUGS } from "@/lib/legal/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/faq", "/leaderboard", "/fixtures", ...LEGAL_SLUGS.map((s) => `/${s}`)];
  return paths.map((path) => ({
    url: `${LEGAL_SITE_URL}${path || "/"}`,
    lastModified: new Date("2026-09-29"),
    changeFrequency: path === "" ? "daily" : "monthly",
    priority:
      path === ""
        ? 1
        : path === "/faq" || path === "/leaderboard" || path === "/fixtures"
          ? 0.8
          : 0.5,
  }));
}
