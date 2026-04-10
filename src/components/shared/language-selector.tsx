"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const languages = [
  { code: "es", label: "ES", flag: "ES" },
  { code: "en", label: "EN", flag: "EN" },
];

interface LanguageSelectorProps {
  variant?: "topbar" | "mobile";
}

export function LanguageSelector({ variant = "topbar" }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === i18n.language) ?? languages[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function changeLang(code: string) {
    i18n.changeLanguage(code);
    setOpen(false);
  }

  if (variant === "mobile") {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Languages className="h-4 w-4" />
          {currentLang.label}
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-1 z-50 bg-white rounded-xl shadow-lg border border-border/50 p-1.5 min-w-[100px] animate-in fade-in zoom-in-95 duration-150">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLang(lang.code)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                  lang.code === i18n.language ? "bg-primary/5 font-semibold" : "hover:bg-muted"
                )}
              >
                <span className="font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-medium"
      >
        <Languages className="h-3.5 w-3.5" />
        {currentLang.label}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-border/50 p-1.5 min-w-[100px] animate-in fade-in zoom-in-95 duration-150">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLang(lang.code)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                lang.code === i18n.language ? "bg-primary/5 font-semibold text-primary" : "hover:bg-muted text-foreground"
              )}
            >
              <span className="font-medium">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
