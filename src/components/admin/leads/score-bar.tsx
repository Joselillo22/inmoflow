"use client";

import { cn } from "@/lib/utils/cn";

interface ScoreBarProps {
  score: number;
  size?: "sm" | "md";
}

export function ScoreBar({ score, size = "sm" }: ScoreBarProps) {
  const color =
    score >= 61 ? "bg-emerald-500" :
    score >= 31 ? "bg-amber-500" : "bg-red-500";

  const textColor =
    score >= 61 ? "text-emerald-600" :
    score >= 31 ? "text-amber-600" : "text-red-600";

  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("rounded-full bg-border/40 overflow-hidden", size === "sm" ? "w-20 h-2" : "w-28 h-2.5")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={cn("font-bold tabular-nums", textColor, size === "sm" ? "text-sm" : "text-base")}>
        {score}
      </span>
    </div>
  );
}
