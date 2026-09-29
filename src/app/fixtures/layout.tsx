import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fixtures",
  description: "Premier League fixtures for the FORM8 gameweek.",
  openGraph: {
    title: "Fixtures · FORM8",
    description: "Premier League fixtures for the FORM8 gameweek.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "FORM8" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function FixturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
