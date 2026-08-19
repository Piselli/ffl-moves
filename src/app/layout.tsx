import type { Metadata, Viewport } from "next";
import { Inter, Oswald, Sofia_Sans_Condensed, Anton } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { PrivyAppProvider } from "@/components/PrivyAppProvider";
import { DepositProvider } from "@/components/DepositProvider";
import { LoginProvider } from "@/components/LoginProvider";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { DevChainBanner } from "@/components/DevChainBanner";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { ReferralCapture } from "@/components/ReferralCapture";
import { PrizeAssetProvider } from "@/components/PrizeAssetProvider";

const inter   = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald  = Oswald({ subsets: ["latin"], variable: "--font-display" });
const wcHero  = Sofia_Sans_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "900"],
  variable: "--font-wc-hero",
});
// Poster-grade masthead face for the World Cup wordmark (official-tournament feel).
const wcDisplay = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-wc-display",
});

const siteTitle = "FORM8 — Premier League fantasy on Solana";
const siteDescription =
  "Build your EPL squad from live gameweek stats, compete for the top 10, and earn USDC prizes on Solana.";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s · FORM8",
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: "FORM8",
    type: "website",
    locale: "en_US",
    alternateLocale: ["uk_UA"],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    site: "@MoveMatchxyz",
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/sprites/fpl-players.webp" as="image" type="image/webp" />
      </head>
      <body className={`${inter.variable} ${oswald.variable} ${wcHero.variable} ${wcDisplay.variable} font-sans antialiased`}>
        <LocaleProvider>
          <PrizeAssetProvider>
            <PrivyAppProvider>
            <WalletProvider>
              <DepositProvider>
              <LoginProvider>
              <ReferralCapture />
              <div className="min-h-screen bg-[#0D0F12] text-white">
              <DevChainBanner />
              <Navbar />
              <main className="relative z-10">{children}</main>
              <SiteFooter />
              </div>
              </LoginProvider>
              </DepositProvider>
            </WalletProvider>
            </PrivyAppProvider>
          </PrizeAssetProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
