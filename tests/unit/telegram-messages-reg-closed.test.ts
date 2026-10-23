import assert from "node:assert/strict";
import { test } from "node:test";
import { msgRegistrationClosed } from "../../src/lib/server/telegram/messages";

test("reg_closed matches locked copy without GW shorthand or prize wording", () => {
  const text = msgRegistrationClosed(16, 64_000_000n);
  assert.equal(
    text,
    [
      "Registration for this tour is closed.",
      "",
      "Good luck to your squads.",
      "Enjoy the English Premier League with FORM8.",
      "",
      "16 managers · $64 USDC reward pool",
      "",
      "https://www.form8.football/leaderboard",
    ].join("\n"),
  );
  assert.equal(/\bGW\d+\b/.test(text), false);
  assert.equal(text.toLowerCase().includes("prize"), false);
});

test("reg_closed singularizes one manager", () => {
  assert.match(msgRegistrationClosed(1, 5_000_000n), /1 manager · \$5 USDC reward pool/);
});
