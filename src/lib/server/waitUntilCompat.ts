/**
 * Keep a Vercel serverless invocation alive after the response is sent.
 * Outside Vercel (dev/tests) the promise just runs in the background.
 */
export function waitUntilCompat(promise: Promise<unknown>): void {
  type Ctx = { waitUntil?: (p: Promise<unknown>) => void };
  const holder = (globalThis as Record<symbol, { get?: () => Ctx | undefined } | undefined>)[
    Symbol.for("@vercel/request-context")
  ];
  holder?.get?.()?.waitUntil?.(promise);
}
