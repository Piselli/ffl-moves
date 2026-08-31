"use client";

import { cn } from "@/lib/utils";
import { USER_TABLET_LOOKS, type TabletVariantId } from "./tabletVariants";

type Props = {
  value: TabletVariantId;
  onChange: (id: TabletVariantId) => void;
  className?: string;
  /** Status bar — smaller swatches + label */
  compact?: boolean;
};

/** Obsidian vs Crystal — tablet plate chrome, separate from pitch turf. */
export function TabletLookPicker({
  value,
  onChange,
  className,
  compact = false,
}: Props) {
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="group"
      aria-label="Tablet look"
    >
      {!compact ? (
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--lt-muted)]">
          Plates
        </span>
      ) : null}
      <div className="flex items-center gap-1 rounded-full bg-black/45 p-1 ring-1 ring-white/15 backdrop-blur-sm">
        {USER_TABLET_LOOKS.map((look) => {
          const active = look.id === value;
          return (
            <button
              key={look.id}
              type="button"
              onClick={() => onChange(look.id)}
              aria-pressed={active}
              aria-label={look.name}
              title={look.name}
              className={cn(
                "rounded-[4px] transition",
                compact ? "h-3 w-3" : "h-3.5 w-3.5",
                active
                  ? "ring-2 ring-white ring-offset-1 ring-offset-black/50"
                  : "opacity-55 hover:opacity-90",
              )}
              style={{
                background: look.swatchBase
                  ? `${look.swatch}, ${look.swatchBase}`
                  : look.swatch,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
