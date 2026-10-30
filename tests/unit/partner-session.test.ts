import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sealPartnerSession,
  unsealPartnerSession,
} from "../../src/lib/partners/session";

const WALLET = "5tbJd2HZjoHB5hhGLyYvwovK7fPKMH2Ss1fsyPNouyjW";

describe("partner session seal", () => {
  it("round-trips partner id + wallet", () => {
    const token = sealPartnerSession({
      partnerId: "acme",
      wallet: WALLET,
    });
    const session = unsealPartnerSession(token);
    assert.deepEqual(session, { partnerId: "acme", wallet: WALLET });
  });

  it("rejects tampered tokens and legacy email sessions", () => {
    const token = sealPartnerSession({
      partnerId: "acme",
      wallet: WALLET,
    });
    const [payload] = token.split(".");
    assert.equal(unsealPartnerSession(`${payload}.deadbeef`), null);
    assert.equal(unsealPartnerSession(""), null);
    assert.equal(unsealPartnerSession(null), null);
  });
});
