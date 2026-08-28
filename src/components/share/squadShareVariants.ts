export { ShareCardPlaque } from "@/components/share/variants/ShareCardPlaque";
export { ShareCardLineSheet } from "@/components/share/variants/ShareCardLineSheet";
export { ShareCardPitchHero } from "@/components/share/variants/ShareCardPitchHero";
export { ShareCardBroadcast } from "@/components/share/variants/ShareCardBroadcast";
export type { SquadShareCardVariantId } from "@/components/share/shareCardTypes";

import type { ComponentType } from "react";
import type {
  SquadShareCardProps,
  SquadShareCardVariantId,
} from "@/components/share/shareCardTypes";
import { ShareCardPlaque } from "@/components/share/variants/ShareCardPlaque";
import { ShareCardLineSheet } from "@/components/share/variants/ShareCardLineSheet";
import { ShareCardPitchHero } from "@/components/share/variants/ShareCardPitchHero";
import { ShareCardBroadcast } from "@/components/share/variants/ShareCardBroadcast";

export const SQUAD_SHARE_CARD_VARIANTS: {
  id: SquadShareCardVariantId;
  label: string;
  tagline: string;
  Component: ComponentType<SquadShareCardProps>;
}[] = [
  {
    id: "plaque",
    label: "Locked · Plaque",
    tagline: "Identity left · site night-turf plaque (step 1: pitch only)",
    Component: ShareCardPlaque,
  },
  {
    id: "line-sheet",
    label: "A · Line Sheet",
    tagline: "Text XI primary · tactical pitch",
    Component: ShareCardLineSheet,
  },
  {
    id: "pitch-hero",
    label: "B · Pitch Hero",
    tagline: "Large pitch · site cutouts",
    Component: ShareCardPitchHero,
  },
  {
    id: "broadcast",
    label: "C · Broadcast",
    tagline: "Pitch centre · surname crawl",
    Component: ShareCardBroadcast,
  },
];
