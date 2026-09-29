import type { MetadataRoute } from "next";
import { LEGAL_SITE_URL } from "@/lib/legal/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/design-lab/", "/design-preview/"],
      },
    ],
    sitemap: `${LEGAL_SITE_URL}/sitemap.xml`,
  };
}
