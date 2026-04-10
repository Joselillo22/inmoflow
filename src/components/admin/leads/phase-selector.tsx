"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { FASE_FUNNEL_LABELS } from "@/lib/utils/constants";
import { useTranslation } from "react-i18next";

const faseColors: Record<string, { bg: string; text: string; dot: string }> = {
  NUEVO: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  CONTACTADO: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  CUALIFICADO: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  VISITA_PROGRAMADA: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  VISITA_REALIZADA: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  OFERTA: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  RESERVA: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  CIERRE: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-600" },
  PERDIDO: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

interface PhaseSelectorProps {
  value: string;
  onChange: (fase: string) => void;
  disabled?: boolean;
}

export function PhaseSelector({ value, onChange, disabled }: PhaseSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const colors = faseColors[value] ?? faseColors.NUEVO;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); if (!disabled) setOpen(!open); }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all",
          "hover:ring-2 hover:ring-primary/20",
          colors.bg, colors.text,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
        {t(`leads.phases.${value}`)}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-[var(--shadow-lg)] border border-border/50 p-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-150">
          {Object.entries(FASE_FUNNEL_LABELS).map(([key, label]) => {
            const c = faseColors[key] ?? faseColors.NUEVO;
            const isActive = key === value;
            return (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(key);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                  isActive ? "bg-primary/5 font-semibold" : "hover:bg-muted"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
                <span className="text-foreground">{t(`leads.phases.${key}`)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
