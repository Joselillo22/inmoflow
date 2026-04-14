"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Building2, UserSquare2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResults {
  leads: { id: string; nombre: string; apellidos: string | null; telefono: string | null; faseFunnel: string }[];
  inmuebles: { id: string; titulo: string; referencia: string; localidad: string; estado: string }[];
  propietarios: { id: string; nombre: string; apellidos: string | null; telefono: string | null }[];
}

const FASE_COLORS: Record<string, string> = {
  NUEVO: "bg-blue-100 text-blue-700",
  CONTACTADO: "bg-cyan-100 text-cyan-700",
  CUALIFICADO: "bg-emerald-100 text-emerald-700",
  VISITA_PROGRAMADA: "bg-amber-100 text-amber-700",
  OFERTA: "bg-violet-100 text-violet-700",
  CIERRE: "bg-green-100 text-green-700",
  PERDIDO: "bg-red-100 text-red-700",
};

const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "bg-emerald-100 text-emerald-700",
  RESERVADO: "bg-amber-100 text-amber-700",
  VENDIDO: "bg-slate-100 text-slate-600",
  EN_CAPTACION: "bg-blue-100 text-blue-700",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: / to focus
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        ref.current?.querySelector("input")?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => { setResults(d.data); setOpen(true); })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function navigate(path: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(path);
  }

  const hasResults = results && (results.leads.length + results.inmuebles.length + results.propietarios.length) > 0;

  return (
    <div ref={ref} className="relative hidden md:flex">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (results) setOpen(true); }}
        placeholder="Buscar leads, pisos, propietarios..."
        className="h-9 w-80 rounded-xl border border-white/30 bg-white pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-white/40 focus:outline-none focus:w-96 transition-all shadow-sm"
      />
      {query ? (
        <button onClick={() => { setQuery(""); setResults(null); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
          <X className="h-3 w-3" />
        </button>
      ) : (
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 font-mono">/</kbd>
      )}

      {/* Results dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
          {loading && (
            <div className="py-4 text-center">
              <span className="text-xs text-secondary">Buscando...</span>
            </div>
          )}

          {!loading && !hasResults && query.length >= 2 && (
            <div className="py-6 text-center">
              <Search className="h-6 w-6 text-secondary/30 mx-auto mb-2" />
              <p className="text-xs text-secondary">Sin resultados para &quot;{query}&quot;</p>
            </div>
          )}

          {!loading && hasResults && results && (
            <div className="max-h-80 overflow-y-auto">
              {/* Leads */}
              {results.leads.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/50">
                    <Users className="h-3 w-3 text-secondary" />
                    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Leads ({results.leads.length})</span>
                  </div>
                  {results.leads.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => navigate(`/leads?open=${l.id}`)}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/[0.03] cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{l.nombre} {l.apellidos ?? ""}</p>
                        {l.telefono && <p className="text-[10px] text-secondary">{l.telefono}</p>}
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FASE_COLORS[l.faseFunnel] ?? "bg-slate-100 text-slate-600"}`}>
                        {l.faseFunnel.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Inmuebles */}
              {results.inmuebles.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/50">
                    <Building2 className="h-3 w-3 text-secondary" />
                    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Inmuebles ({results.inmuebles.length})</span>
                  </div>
                  {results.inmuebles.map((i) => (
                    <div
                      key={i.id}
                      onClick={() => navigate(`/inmuebles?open=${i.id}`)}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/[0.03] cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{i.titulo}</p>
                        <p className="text-[10px] text-secondary">{i.referencia} · {i.localidad}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_COLORS[i.estado] ?? "bg-slate-100 text-slate-600"}`}>
                        {i.estado.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Propietarios */}
              {results.propietarios.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/50">
                    <UserSquare2 className="h-3 w-3 text-secondary" />
                    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Propietarios ({results.propietarios.length})</span>
                  </div>
                  {results.propietarios.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/propietarios?open=${p.id}`)}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/[0.03] cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.nombre} {p.apellidos ?? ""}</p>
                        {p.telefono && <p className="text-[10px] text-secondary">{p.telefono}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
