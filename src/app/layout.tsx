import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";

const inter   = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald  = Oswald({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Fantasy EPL on Movement",
  description: "Fantasy football game powered by Movement Network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${oswald.variable} font-sans antialiased`}>
        <WalletProvider>
          <div className="min-h-screen bg-[#0D0F12] text-white">
            <Navbar />
            <main className="relative z-10">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
