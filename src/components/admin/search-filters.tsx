"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchFiltersProps {
  filters?: FilterOption[];
  placeholder?: string;
  basePath: string;
}

export function SearchFilters({ filters = [], placeholder = "Buscar...", basePath }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function applyFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function clearAll() {
    setSearch("");
    router.push(basePath);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      applyFilters({ search });
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {filters.map((filter) => (
        <select
          key={filter.key}
          value={searchParams.get(filter.key) ?? ""}
          onChange={(e) => applyFilters({ [filter.key]: e.target.value })}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm cursor-pointer focus:border-primary focus:outline-none"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="h-4 w-4" /> Limpiar
        </Button>
      )}
    </div>
  );
}
