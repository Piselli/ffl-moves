import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner cabinet · FORM8",
  robots: { index: false, follow: false },
};

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
