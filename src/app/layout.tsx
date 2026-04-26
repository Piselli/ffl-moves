import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";
import { DevChainBanner } from "@/components/DevChainBanner";

const inter   = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald  = Oswald({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Fantasy EPL on Movement",
  description: "Fantasy football game powered by Movement Network",
};

/** Without this, some mobile browsers use a ~980px layout width and `md:` breakpoints never match “phone”. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0F12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/sprites/fpl-players.webp" as="image" type="image/webp" />
      </head>
      <body className={`${inter.variable} ${oswald.variable} font-sans antialiased`}>
        <WalletProvider>
          <div className="min-h-screen bg-[#0D0F12] text-white">
            <DevChainBanner />
            <Navbar />
            <main className="relative z-10">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
