import { WcCampaignAmbient } from "@/components/wc/WcDecor";
import { WcLayoutChrome } from "@/components/wc/WcLayoutChrome";
import { Anton, Sofia_Sans_Condensed } from "next/font/google";

const wcHero = Sofia_Sans_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "900"],
  variable: "--font-wc-hero",
});
const wcDisplay = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-wc-display",
});

export const dynamic = "force-dynamic";

export default function WorldCupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${wcHero.variable} ${wcDisplay.variable} relative min-h-screen bg-[#0a0b0e] text-white`}>
      <WcCampaignAmbient />
      <WcLayoutChrome />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
