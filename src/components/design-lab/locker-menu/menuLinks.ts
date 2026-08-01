/** Shared IA with locker-hero nav — public places first. */
export const MENU_DESTINATIONS = [
  {
    href: "/leaderboard",
    label: "Leaderboard",
    hint: "This week’s table",
    code: "01",
  },
  {
    href: "/season-leaderboard",
    label: "Season",
    hint: "The long race",
    code: "02",
  },
  {
    href: "/titles",
    label: "Talents",
    hint: "Scouting board",
    code: "03",
  },
  {
    href: "/faq",
    label: "FAQ",
    hint: "How it works",
    code: "04",
  },
] as const;

export type MenuDestination = (typeof MENU_DESTINATIONS)[number];
