/**
 * Keep a Vercel serverless invocation alive after the response is sent.
 * Outside Vercel (dev/tests) the promise still runs in the background via `void`.
 */
export function waitUntilCompat(promise: Promise<unknown>): void {
  type Ctx = { waitUntil?: (p: Promise<unknown>) => void };
  const holder = (globalThis as Record<symbol, { get?: () => Ctx | undefined } | undefined>)[
    Symbol.for("@vercel/request-context")
  ];
  const waitUntil = holder?.get?.()?.waitUntil;
  if (typeof waitUntil === "function") {
    waitUntil(promise);
    return;
  }
  void promise;
}
