"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** iOS dark grouped surface — sits on tablet canvas, not inside GlassPanel. */
export const IOS_GROUP = "#1C1C1E";
export const IOS_SEPARATOR = "rgba(255,255,255,0.08)";

export function IosSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 pb-1.5 pt-0.5 text-[13px] font-normal uppercase tracking-wide text-white/45">
      {children}
    </p>
  );
}

export function IosGrouped({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-4 overflow-hidden rounded-[10px]", className)}
      style={{ background: IOS_GROUP }}
    >
      {children}
    </div>
  );
}

export function IosRow({
  children,
  trailing,
  inset = true,
  last = false,
  className,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  inset?: boolean;
  last?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[44px] items-center gap-3 px-4 py-2",
        !last && "border-b",
        className,
      )}
      style={!last ? { borderColor: IOS_SEPARATOR } : undefined}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {!last && inset ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-[60px] right-0 hidden"
        />
      ) : null}
    </div>
  );
}

export function IosWidget({
  children,
  className,
  tall,
}: {
  children: ReactNode;
  className?: string;
  tall?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[18px] p-3",
        tall ? "min-h-0" : "",
        className,
      )}
      style={{
        background: IOS_GROUP,
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
      }}
    >
      {children}
    </div>
  );
}

export function IosTrailingPts({ pts }: { pts: number }) {
  return (
    <span className="text-[17px] font-normal tabular-nums text-white/45">
      {pts}
    </span>
  );
}

export function IosTrailingPtsAccent({ pts }: { pts: number }) {
  return (
    <span className="text-[17px] font-semibold tabular-nums text-[#30D158]">
      {pts}
    </span>
  );
}

export function IosLargeTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="shrink-0 px-3 pb-1 pt-0">
      {eyebrow ? (
        <p className="text-[11px] font-medium text-white/40">{eyebrow}</p>
      ) : null}
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-[26px] font-bold leading-none tracking-tight text-white">
          {title}
        </h2>
        {subtitle}
      </div>
    </div>
  );
}
