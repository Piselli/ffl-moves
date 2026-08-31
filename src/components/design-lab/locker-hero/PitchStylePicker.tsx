"use client";

import { cn } from "@/lib/utils";
import { PITCH_STYLES, type PitchStyleId } from "./pitchStyles";

type Props = {
  value: PitchStyleId;
  onChange: (id: PitchStyleId) => void;
  className?: string;
};

/** Night Turf vs Solid Emerald — lives on the pitch fringe (bottom-right). */
export function PitchStylePicker({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-black/45 p-1 ring-1 ring-white/15 backdrop-blur-sm",
        className,
      )}
      role="group"
      aria-label="Pitch look"
    >
      {PITCH_STYLES.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            aria-pressed={active}
            aria-label={p.name}
            title={p.name}
            className={cn(
              "h-3 w-3 rounded-full transition md:h-3.5 md:w-3.5",
              active
                ? "ring-2 ring-white ring-offset-1 ring-offset-black/50"
                : "opacity-55 hover:opacity-90",
            )}
            style={{
              background: p.image
                ? `center / cover url(${p.image}), ${p.swatch}`
                : p.swatch,
            }}
          />
        );
      })}
    </div>
  );
}
