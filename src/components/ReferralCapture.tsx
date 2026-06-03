"use client";

import { useEffect } from "react";
import { captureReferralFromUrl } from "@/lib/referralClient";

/**
 * Invisible client component: captures `?ref=` on mount and persists it.
 * Mounted once in the root layout.
 */
export function ReferralCapture() {
  useEffect(() => {
    captureReferralFromUrl();
  }, []);
  return null;
}
