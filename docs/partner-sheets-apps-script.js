/**
 * FORM8 partner referral sync → this Google Spreadsheet.
 *
 * Setup:
 * 1. Extensions → Apps Script → paste this file
 * 2. Project Settings → Script properties:
 *      PARTNER_KEY = <key from REFERRAL_PARTNERS>
 *      API_BASE    = https://www.form8.football   (optional)
 * 3. Run syncPartnerStats once, approve permissions
 * 4. Run installHourlyTrigger once
 *
 * Links for creatives (short, webmaster-style):
 *   https://www.form8.football/r/acme
 *   https://www.form8.football/r/acme/creo1
 */

function syncPartnerStats() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty("PARTNER_KEY");
  const base = (props.getProperty("API_BASE") || "https://www.form8.football").replace(/\/$/, "");
  if (!key) throw new Error("Set Script property PARTNER_KEY");

  const url = base + "/api/referral/partner?key=" + encodeURIComponent(key);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code !== 200) throw new Error("API " + code + ": " + body.slice(0, 400));

  const data = JSON.parse(body);
  const ss = getSpreadsheet_();

  writeSummary_(ss, data);
  writeCampaigns_(ss, data);
  writeConversions_(ss, data);
  writeLinks_(ss, data);
  writeMeta_(ss, data);
}

/** Bound sheet → active; standalone project → Script property SHEET_ID. */
function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("Set Script property SHEET_ID (spreadsheet id)");
  return SpreadsheetApp.openById(id);
}

function installHourlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncPartnerStats") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncPartnerStats").timeBased().everyHours(1).create();
}

function writeSummary_(ss, data) {
  const sh = ensureSheet_(ss, "Summary");
  sh.clear();
  const header = [
    "code",
    "link",
    "clicks",
    "signups",
    "conversion_rate",
    "estimated_fee_usdc",
    "first_seen",
    "last_activity",
  ];
  const rows = (data.codes || []).map(function (r) {
    return [
      r.code,
      r.link,
      r.clicks,
      r.signups,
      r.conversionRate,
      r.estimatedFeeVolumeUsdc,
      r.firstSeen ? new Date(r.firstSeen) : "",
      r.lastActivity ? new Date(r.lastActivity) : "",
    ];
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  if (rows.length) sh.getRange(2, 1, rows.length + 1, header.length).setValues(rows);
  sh.autoResizeColumns(1, header.length);
}

function writeCampaigns_(ss, data) {
  const sh = ensureSheet_(ss, "Campaigns");
  sh.clear();
  const header = [
    "code",
    "campaign",
    "link",
    "clicks",
    "signups",
    "conversion_rate",
    "estimated_fee_usdc",
    "first_seen",
    "last_activity",
  ];
  const rows = (data.campaigns || []).map(function (r) {
    return [
      r.code,
      r.campaign,
      r.link,
      r.clicks,
      r.signups,
      r.conversionRate,
      r.estimatedFeeVolumeUsdc,
      r.firstSeen ? new Date(r.firstSeen) : "",
      r.lastActivity ? new Date(r.lastActivity) : "",
    ];
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  if (rows.length) sh.getRange(2, 1, rows.length + 1, header.length).setValues(rows);
  sh.autoResizeColumns(1, header.length);
}

function writeConversions_(ss, data) {
  const sh = ensureSheet_(ss, "Conversions");
  sh.clear();
  const header = ["wallet", "code", "campaign"];
  const rows = (data.conversions || []).map(function (r) {
    return [r.wallet, r.code, r.campaign || "(default)"];
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  if (rows.length) sh.getRange(2, 1, rows.length + 1, header.length).setValues(rows);
  sh.autoResizeColumns(1, header.length);
}

/**
 * Ready-to-copy creative links. Partner invents any campaign name:
 *   base + "&c=" + slug   (spaces → -, Cyrillic OK)
 * No pre-registration — first click creates the Campaigns row.
 */
function writeLinks_(ss, data) {
  const sh = ensureSheet_(ss, "Links");
  sh.clear();
  const baseCode =
    (data.codes && data.codes[0] && data.codes[0].code) ||
    (data.partner && data.partner.id) ||
    "bonus50";
  const origin = (PropertiesService.getScriptProperties().getProperty("API_BASE") ||
    "https://www.form8.football").replace(/\/$/, "");
  const main = origin + "/r/" + encodeURIComponent(baseCode);
  const examples = ["creo1", "creo2", "creo3", "stories-1", "invite"];
  const header = ["label", "link", "how_to"];
  const rows = [
    [
      "MAIN (all traffic)",
      main,
      "One short link for all traffic (CPA / webmaster style)",
    ],
  ];
  examples.forEach(function (c) {
    rows.push([
      c,
      main + "/" + encodeURIComponent(c),
      "Same partner, campaign=" + c + ". Change the last path segment to any name.",
    ]);
  });
  rows.push([
    "YOUR NAME HERE",
    main + "/",
    "Append any campaign slug after /r/CODE/ (e.g. /r/bonus50/test-stories-1). Stats appear on Campaigns after first click.",
  ]);
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  sh.getRange(2, 1, rows.length + 1, header.length).setValues(rows);
  sh.autoResizeColumns(1, header.length);
}

function writeMeta_(ss, data) {
  const sh = ensureSheet_(ss, "Meta");
  sh.clear();
  const t = data.totals || {};
  const rows = [
    ["partner_id", data.partner && data.partner.id],
    ["partner_label", data.partner && data.partner.label],
    ["updated_at", data.updatedAt],
    ["durable", data.durable],
    ["total_clicks", t.clicks],
    ["total_signups", t.signups],
    ["total_conversion_rate", t.conversionRate],
    ["total_estimated_fee_usdc", t.estimatedFeeVolumeUsdc],
    ["note", data.note || ""],
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.autoResizeColumns(1, 2);
}

function ensureSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
