import { WcCampaignAmbient } from "@/components/wc/WcDecor";

export const dynamic = "force-dynamic";

export default function WorldCupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0a0b0e] text-white">
      <WcCampaignAmbient />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
