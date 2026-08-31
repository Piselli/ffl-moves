"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  /** Lab: lift / brighten on hover (Hover Craft + Plates+) */
  interactive?: boolean;
  /** Max frost — refractive edge + dual sheen (Crystal Glass chrome) */
  crystal?: boolean;
  /**
   * Naming-sheet plate: opaque #0a0a0a, soft rim, whisper top sheen
   * (tmp/naming-table.html) — not frosted glass.
   */
  matte?: boolean;
  style?: CSSProperties;
};

/**
 * Panel shell — frosted glass by default.
 * Reads `--lt-glass-*` when set by tablet palette variants.
 * `matte` = naming-shortlist solid plate.
 */
export function GlassPanel({
  children,
  className,
  as: Tag = "div",
  interactive = false,
  crystal = false,
  matte = false,
  style,
}: Props) {
  const baseStyle: CSSProperties = matte
    ? {
        background: "var(--lt-glass-bg, #0a0a0a)",
        boxShadow: [
          "0 0 0 1px var(--lt-glass-ring, rgba(255,255,255,0.19))",
          "var(--lt-glass-shadow, inset 0 1px 0 rgba(255,255,255,0.11), 0 14px 40px rgba(0,0,0,0.55))",
        ].join(", "),
      }
    : {
        background: "var(--lt-glass-bg, rgba(0,0,0,0.75))",
        backdropFilter: "blur(var(--lt-glass-blur, 24px))",
        WebkitBackdropFilter: "blur(var(--lt-glass-blur, 24px))",
        boxShadow: [
          "0 0 0 1px var(--lt-glass-ring, rgba(255,255,255,0.20))",
          "var(--lt-glass-shadow, inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -12px 28px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.45))",
        ].join(", "),
      };

  return (
    <Tag
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-2xl",
        interactive &&
          "transition-[box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-[1.03]",
        crystal &&
          !matte &&
          "hover:brightness-[1.05] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.32)]",
        className,
      )}
      style={{ ...baseStyle, ...style }}
    >
      {matte ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background:
              "var(--lt-glass-sheen, linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 16%))",
          }}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background:
              "var(--lt-glass-sheen, linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 28%))",
          }}
        />
      )}
      {crystal && !matte ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background:
                "radial-gradient(120% 80% at 12% -10%, rgba(255,255,255,0.22) 0%, transparent 42%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 0 24px rgba(180,210,255,0.06)",
            }}
          />
        </>
      ) : null}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </Tag>
  );
}
