import type { SiteMessages } from "@/i18n/messages";

export type SiteNavLink = { href: string; label: string; featured?: boolean };

/**
 * Shared primary IA — locker scenes (homepage, GW leaderboard) and the global
 * navbar on FAQ, fixtures, etc. Logo / brand always links home (squad pick).
 */
export function primarySiteNavLinks(m: SiteMessages): SiteNavLink[] {
  return [
    { href: "/leaderboard", label: m.nav.leaderboard },
    { href: "/season-leaderboard", label: m.nav.seasonPoints },
    { href: "/fixtures", label: m.nav.fixtures },
    { href: "/faq", label: m.nav.faq },
  ];
}

/** Locker nav inserts Talents (soon) after the first N links. */
export const LOCKER_NAV_TALENTS_AFTER = 2;
