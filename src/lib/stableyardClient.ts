import type { PaymentResult } from "@stableyard/widget";

export type StableyardPayOptions = {
  recipient: string;
  destination: {
    chainId: number;
    token: string;
    tokenAddress?: string;
    decimals?: number;
    amount?: string | number;
  };
  routeMode?: "exact_input" | "exact_output";
  executionMode?: "standard" | "atomic" | "deposit_address" | "boosted";
  theme?: "light" | "dark" | "auto";
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
};

export type StableyardApi = {
  init: (config?: {
    theme?: "light" | "dark" | "auto";
    appearance?: { variables?: Record<string, string> };
    walletProvider?: "internal-privy" | "external-privy" | "none";
  }) => void;
  pay: (options: StableyardPayOptions) => void;
};

declare global {
  interface Window {
    Stableyard?: StableyardApi;
  }
}

const STABLEYARD_SCRIPT_SRC =
  "https://unpkg.com/@stableyard/widget@1.0.26/dist/standalone.js";

let loadPromise: Promise<StableyardApi> | null = null;

function initStableyard(api: StableyardApi): StableyardApi {
  api.init({
    theme: "dark",
    walletProvider: "internal-privy",
    appearance: {
      variables: {
        colorPrimary: "#00f948",
        colorBackground: "#14171c",
        colorText: "#ffffff",
        colorTextSecondary: "#9ca3af",
        colorBorder: "rgba(255,255,255,0.12)",
        colorSuccess: "#00f948",
        colorError: "#f87171",
        fontFamily: "inherit",
        borderRadius: "12px",
      },
    },
  });
  return api;
}

/** Browser-only: loads Stableyard standalone (UMD) onto `window.Stableyard`. */
export function loadStableyardClient(): Promise<StableyardApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Stableyard is only available in the browser"));
  }

  if (window.Stableyard?.pay) {
    return Promise.resolve(initStableyard(window.Stableyard));
  }

  if (!loadPromise) {
    loadPromise = new Promise<StableyardApi>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-stableyard-widget="1"]',
      );
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.Stableyard?.pay) resolve(initStableyard(window.Stableyard));
          else reject(new Error("Stableyard loaded but API missing"));
        });
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load Stableyard widget")),
        );
        return;
      }

      const script = document.createElement("script");
      script.src = STABLEYARD_SCRIPT_SRC;
      script.async = true;
      script.dataset.stableyardWidget = "1";
      script.onload = () => {
        if (window.Stableyard?.pay) resolve(initStableyard(window.Stableyard));
        else reject(new Error("Stableyard loaded but API missing"));
      };
      script.onerror = () => reject(new Error("Failed to load Stableyard widget"));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}
