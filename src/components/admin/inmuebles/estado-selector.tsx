"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { ESTADO_INMUEBLE_LABELS } from "@/lib/utils/constants";
import { useTranslation } from "react-i18next";

const estadoColors: Record<string, { bg: string; text: string; dot: string }> = {
  EN_CAPTACION: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ACTIVO: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  RESERVADO: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  VENDIDO: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  ALQUILADO: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  RETIRADO: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

interface EstadoSelectorProps {
  value: string;
  onChange: (estado: string) => void;
  disabled?: boolean;
}

export function EstadoSelector({ value, onChange, disabled }: EstadoSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const colors = estadoColors[value] ?? estadoColors.EN_CAPTACION;

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
        {t(`inmuebles.statuses.${value}`)}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-[var(--shadow-lg)] border border-border/50 p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
          {Object.entries(ESTADO_INMUEBLE_LABELS).map(([key, label]) => {
            const c = estadoColors[key] ?? estadoColors.EN_CAPTACION;
            return (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); onChange(key); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                  key === value ? "bg-primary/5 font-semibold" : "hover:bg-muted"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
                <span className="text-foreground">{t(`inmuebles.statuses.${key}`)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
