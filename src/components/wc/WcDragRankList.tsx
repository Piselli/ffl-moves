"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function WcDragRankList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  readOnly = false,
  className,
}: {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, rank: number, dragHandleProps: DragHandleProps) => React.ReactNode;
  readOnly?: boolean;
  className?: string;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const reorder = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    const fromIdx = items.findIndex((it) => getKey(it) === fromKey);
    const toIdx = items.findIndex((it) => getKey(it) === toKey);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved!);
    onReorder(next);
  };

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, rank) => {
        const key = getKey(item);
        const isDragging = dragKey === key;
        const isOver = overKey === key && dragKey != null && dragKey !== key;

        const dragHandleProps: DragHandleProps = readOnly
          ? { draggable: false }
          : {
              draggable: true,
              onDragStart: (e) => {
                setDragKey(key);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", key);
              },
              onDragEnd: () => {
                setDragKey(null);
                setOverKey(null);
              },
            };

        return (
          <li
            key={key}
            onDragOver={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    setOverKey(key);
                  }
            }
            onDragLeave={readOnly ? undefined : () => setOverKey((k) => (k === key ? null : k))}
            onDrop={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    const from = e.dataTransfer.getData("text/plain") || dragKey;
                    if (from) reorder(from, key);
                    setDragKey(null);
                    setOverKey(null);
                  }
            }
            className={cn(
              "transition-transform duration-150",
              isDragging && "scale-[0.98] opacity-40",
              isOver && "translate-y-0.5",
            )}
          >
            {renderItem(item, rank + 1, dragHandleProps)}
          </li>
        );
      })}
    </ul>
  );
}

export type DragHandleProps = {
  draggable: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
};

export function DragGrip(props: DragHandleProps & { label?: string }) {
  if (!props.draggable) return null;
  return (
    <button
      type="button"
      {...props}
      aria-label={props.label ?? "Drag to reorder"}
      className="cursor-grab touch-none rounded p-1 text-white/25 active:cursor-grabbing hover:bg-white/10 hover:text-white/60"
    >
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="5" cy="4" r="1.2" />
        <circle cx="11" cy="4" r="1.2" />
        <circle cx="5" cy="8" r="1.2" />
        <circle cx="11" cy="8" r="1.2" />
        <circle cx="5" cy="12" r="1.2" />
        <circle cx="11" cy="12" r="1.2" />
      </svg>
    </button>
  );
}
