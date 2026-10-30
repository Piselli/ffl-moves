import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sealPartnerSession,
  unsealPartnerSession,
} from "../../src/lib/partners/session";

describe("partner session seal", () => {
  it("round-trips partner id + email", () => {
    const token = sealPartnerSession({
      partnerId: "acme",
      email: "Partner@Gmail.com",
    });
    const session = unsealPartnerSession(token);
    assert.deepEqual(session, { partnerId: "acme", email: "partner@gmail.com" });
  });

  it("rejects tampered tokens", () => {
    const token = sealPartnerSession({
      partnerId: "acme",
      email: "a@b.co",
    });
    const [payload] = token.split(".");
    assert.equal(unsealPartnerSession(`${payload}.deadbeef`), null);
    assert.equal(unsealPartnerSession(""), null);
    assert.equal(unsealPartnerSession(null), null);
  });
});
