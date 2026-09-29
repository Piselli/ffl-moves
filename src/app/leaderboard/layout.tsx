import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live FORM8 standings and prize claims for the current gameweek.",
  openGraph: {
    title: "Leaderboard · FORM8",
    description: "Live FORM8 standings and prize claims for the current gameweek.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "FORM8" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
