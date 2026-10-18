import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fillMissingPartnerCodes,
  filterStatsForPartner,
  parseReferralPartners,
} from "../../src/lib/referralPartners";
import { normalizeCampaign, type ReferralStat } from "../../src/lib/referral";
import {
  buildReferralLink,
  buildShortReferralLink,
  parseShortReferralPath,
} from "../../src/lib/referralLink";

describe("parseReferralPartners", () => {
  it("parses valid partners and drops bad rows", () => {
    const raw = JSON.stringify([
      { id: "acme", label: "Acme Co", key: "secret1", codes: ["Acme", "acme-2"] },
      { id: "bad", key: "x", codes: [] },
      { not: "a partner" },
    ]);
    const partners = parseReferralPartners(raw);
    assert.equal(partners.length, 1);
    assert.deepEqual(partners[0], {
      id: "acme",
      label: "Acme Co",
      key: "secret1",
      codes: ["acme", "acme-2"],
    });
  });

  it("returns empty on invalid JSON", () => {
    assert.deepEqual(parseReferralPartners("{"), []);
    assert.deepEqual(parseReferralPartners(""), []);
  });
});

describe("filter / fill partner stats", () => {
  const partner = {
    id: "acme",
    label: "Acme",
    key: "k",
    codes: ["acme", "acme2"],
  };

  const stats: ReferralStat[] = [
    {
      code: "acme",
      clicks: 10,
      signups: 2,
      conversionRate: 0.2,
      firstSeen: 1,
      lastActivity: 2,
      estimatedFeeVolumeUsdc: 2,
    },
    {
      code: "other",
      clicks: 99,
      signups: 9,
      conversionRate: 0.09,
      firstSeen: 1,
      lastActivity: 2,
      estimatedFeeVolumeUsdc: 9,
    },
  ];

  it("keeps only partner codes", () => {
    const filtered = filterStatsForPartner(stats, partner);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.code, "acme");
  });

  it("fills zero rows for unused codes", () => {
    const filled = fillMissingPartnerCodes(filterStatsForPartner(stats, partner), partner);
    assert.equal(filled.length, 2);
    assert.equal(filled[0]!.signups, 2);
    assert.equal(filled[1]!.code, "acme2");
    assert.equal(filled[1]!.clicks, 0);
  });
});

describe("campaign slugs + links", () => {
  it("normalizes campaign names (spaces, Cyrillic)", () => {
    assert.equal(normalizeCampaign("1 creo"), "1-creo");
    assert.equal(normalizeCampaign("Тест Сторис"), "тест-сторис");
    assert.equal(normalizeCampaign(""), "");
    assert.equal(normalizeCampaign(null), "");
  });

  it("keeps the same ref and adds ?c=", () => {
    const base = "https://www.form8.football/";
    assert.equal(
      buildReferralLink(base, "acme", "creo1"),
      "https://www.form8.football/?ref=acme&c=creo1",
    );
    assert.equal(buildReferralLink(base, "acme"), "https://www.form8.football/?ref=acme");
  });

  it("builds short webmaster links /r/code/campaign", () => {
    const base = "https://www.form8.football/";
    assert.equal(buildShortReferralLink(base, "bonus50"), "https://www.form8.football/r/bonus50");
    assert.equal(
      buildShortReferralLink(base, "bonus50", "creo1"),
      "https://www.form8.football/r/bonus50/creo1",
    );
  });

  it("parses short referral paths", () => {
    assert.deepEqual(parseShortReferralPath("/r/bonus50"), { code: "bonus50", campaign: "" });
    assert.deepEqual(parseShortReferralPath("/r/bonus50/creo1"), {
      code: "bonus50",
      campaign: "creo1",
    });
    assert.equal(parseShortReferralPath("/other"), null);
  });
});
