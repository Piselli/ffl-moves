import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "How FORM8 works — entry fees, wallets, prizes, and Season XP.",
  openGraph: {
    title: "FAQ · FORM8",
    description: "How FORM8 works — entry fees, wallets, prizes, and Season XP.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "FORM8" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
