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
 * Links for creatives: same ?ref=CODE, different ?c=CAMPAIGN
 *   https://www.form8.football/?ref=acme&c=creo1
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  writeSummary_(ss, data);
  writeCampaigns_(ss, data);
  writeConversions_(ss, data);
  writeMeta_(ss, data);
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
