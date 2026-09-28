"use client";

import { useEffect } from "react";
import { captureInviteFromUrl } from "@/lib/inviteClient";

/**
 * Invisible client component: captures `?inv=` on mount and persists it.
 * Mounted once in the root layout alongside ReferralCapture.
 */
export function InviteCapture() {
  useEffect(() => {
    captureInviteFromUrl();
  }, []);
  return null;
}
