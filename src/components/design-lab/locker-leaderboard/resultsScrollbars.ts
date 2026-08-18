/**
 * Per-chrome scrollbar demos for results tablet.
 * Applied via `.rt-scroll` inside `[data-rt-chrome="…"]`.
 */

import type { ResultsChromeId } from "./resultsChromeVariants";

export type ScrollbarDemo = {
  id: ResultsChromeId;
  label: string;
  hint: string;
};

/** One scrollbar look per interface chrome — pick a keeper. */
export const SCROLLBAR_DEMOS: Record<ResultsChromeId, ScrollbarDemo> = {
  home: {
    id: "home",
    label: "Hidden",
    hint: "Same as homepage — no thumb",
  },
  slate: {
    id: "slate",
    label: "Pill",
    hint: "5px soft white capsule",
  },
  crystal: {
    id: "crystal",
    label: "Frost",
    hint: "Wide frosted glass thumb",
  },
  press: {
    id: "press",
    label: "Pill",
    hint: "Round white capsule",
  },
  pulse: {
    id: "pulse",
    label: "Signal",
    hint: "Thin green live thumb",
  },
  wallet: {
    id: "wallet",
    label: "Ash",
    hint: "Quiet charcoal track",
  },
  banger: {
    id: "banger",
    label: "Glow",
    hint: "Green glow tip",
  },
};

function rule(
  chrome: ResultsChromeId,
  webkit: string,
  firefox: string,
): string {
  return `
[data-rt-chrome="${chrome}"] .rt-scroll {
  ${firefox}
}
[data-rt-chrome="${chrome}"] .rt-scroll::-webkit-scrollbar {
  width: var(--rt-sb-w, 6px);
  height: var(--rt-sb-w, 6px);
}
[data-rt-chrome="${chrome}"] .rt-scroll::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}
[data-rt-chrome="${chrome}"] .rt-scroll::-webkit-scrollbar-corner {
  background: transparent;
}
${webkit}
`.trim();
}

/** CSS block injected once into ResultsTablet. */
export function resultsScrollbarCss(): string {
  return [
    /* Homepage — invisible */
    rule(
      "home",
      `
[data-rt-chrome="home"] .rt-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
`,
      `-ms-overflow-style: none; scrollbar-width: none;`,
    ),

    /* Slate — readable pill + track (scroll affordance) */
    rule(
      "slate",
      `
[data-rt-chrome="slate"] .rt-scroll { --rt-sb-w: 6px; }
[data-rt-chrome="slate"] .rt-scroll::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.06);
  border-radius: 99px;
  margin: 10px 2px;
}
[data-rt-chrome="slate"] .rt-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.42);
  border-radius: 99px;
  border: 1px solid transparent;
  background-clip: padding-box;
}
[data-rt-chrome="slate"] .rt-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.58);
  background-clip: padding-box;
}
`,
      `scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.45) rgba(255,255,255,0.06);`,
    ),

    /* Crystal — wider frost */
    rule(
      "crystal",
      `
[data-rt-chrome="crystal"] .rt-scroll { --rt-sb-w: 8px; }
[data-rt-chrome="crystal"] .rt-scroll::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.04);
  border-radius: 99px;
  margin: 6px 0;
}
[data-rt-chrome="crystal"] .rt-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.12));
  border-radius: 99px;
  border: 2px solid transparent;
  background-clip: padding-box;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
}
`,
      `scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.35) rgba(255,255,255,0.06);`,
    ),

    /* Press — round white pill */
    rule(
      "press",
      `
[data-rt-chrome="press"] .rt-scroll { --rt-sb-w: 5px; }
[data-rt-chrome="press"] .rt-scroll::-webkit-scrollbar-track { background: transparent; }
[data-rt-chrome="press"] .rt-scroll::-webkit-scrollbar-thumb {
  background: #fff;
  border-radius: 99px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
}
`,
      `scrollbar-width: thin; scrollbar-color: #fff transparent;`,
    ),

    /* Pulse — signal green */
    rule(
      "pulse",
      `
[data-rt-chrome="pulse"] .rt-scroll { --rt-sb-w: 3px; }
[data-rt-chrome="pulse"] .rt-scroll::-webkit-scrollbar-track { background: transparent; }
[data-rt-chrome="pulse"] .rt-scroll::-webkit-scrollbar-thumb {
  background: #00f948;
  border-radius: 99px;
  opacity: 0.85;
}
[data-rt-chrome="pulse"] .rt-scroll::-webkit-scrollbar-thumb:hover {
  box-shadow: 0 0 10px rgba(0,249,72,0.45);
}
`,
      `scrollbar-width: thin; scrollbar-color: #00f948 transparent;`,
    ),

    /* Wallet — quiet ash */
    rule(
      "wallet",
      `
[data-rt-chrome="wallet"] .rt-scroll { --rt-sb-w: 4px; }
[data-rt-chrome="wallet"] .rt-scroll::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.03);
  border-radius: 99px;
}
[data-rt-chrome="wallet"] .rt-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.16);
  border-radius: 99px;
}
`,
      `scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) rgba(255,255,255,0.04);`,
    ),

    /* Banger — glow green */
    rule(
      "banger",
      `
[data-rt-chrome="banger"] .rt-scroll { --rt-sb-w: 4px; }
[data-rt-chrome="banger"] .rt-scroll::-webkit-scrollbar-track { background: transparent; }
[data-rt-chrome="banger"] .rt-scroll::-webkit-scrollbar-thumb {
  background: #00f948;
  border-radius: 99px;
  box-shadow: 0 0 12px rgba(0,249,72,0.55), 0 0 2px #00f948;
}
`,
      `scrollbar-width: thin; scrollbar-color: #00f948 transparent;`,
    ),
  ].join("\n\n");
}
