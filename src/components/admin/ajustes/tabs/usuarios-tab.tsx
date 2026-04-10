"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { Search, Plus, Users, X, Pencil, Check, Power, PowerOff } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";

interface UsuarioItem {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: string;
  activo: boolean;
  createdAt: string;
  comercial: { id: string; telefono: string; zona: string } | null;
}

const rolColors: Record<string, { variant: "info" | "success" | "warning"; label: string }> = {
  ADMIN: { variant: "info", label: "Admin" },
  COORDINADORA: { variant: "warning", label: "Coordinadora" },
  COMERCIAL: { variant: "success", label: "Comercial" },
};

export function UsuariosTab() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("");
  const [showCrear, setShowCrear] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [crearForm, setCrearForm] = useState({ nombre: "", apellidos: "", email: "", password: "", rol: "ADMIN" });
  const [editForm, setEditForm] = useState({ nombre: "", apellidos: "", email: "", activo: true, password: "" });

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/usuarios");
    if (res.ok) { const data = await res.json(); setUsuarios(data.data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const filtered = usuarios.filter((u) => {
    const matchSearch = !search || `${u.nombre} ${u.apellidos} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRol = !filterRol || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  async function crearUsuario() {
    if (!crearForm.nombre || !crearForm.email || !crearForm.password) {
      toast("Nombre, email y password son obligatorios", "error"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(crearForm) });
      if (res.ok) { toast("Usuario creado", "success"); setShowCrear(false); setCrearForm({ nombre: "", apellidos: "", email: "", password: "", rol: "ADMIN" }); fetchUsuarios(); }
      else { const err = await res.json(); toast(err.error ?? "Error", "error"); }
    } finally { setSaving(false); }
  }

  function startEdit(u: UsuarioItem) {
    setEditId(u.id);
    setEditForm({ nombre: u.nombre, apellidos: u.apellidos, email: u.email, activo: u.activo, password: "" });
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { nombre: editForm.nombre, apellidos: editForm.apellidos, email: editForm.email, activo: editForm.activo };
      if (editForm.password) body.password = editForm.password;
      const res = await fetch(`/api/usuarios/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { toast("Usuario actualizado", "success"); setEditId(null); fetchUsuarios(); }
      else { const err = await res.json(); toast(err.error ?? "Error", "error"); }
    } finally { setSaving(false); }
  }

  async function toggleActivo(u: UsuarioItem) {
    await fetch(`/api/usuarios/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !u.activo }) });
    fetchUsuarios();
  }

  const inputClass = "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15";

  return (
    <div className="p-5 space-y-4">
      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email..."
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base text-foreground focus:border-primary focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {[{ key: "", label: "Todos" }, { key: "ADMIN", label: "Admin" }, { key: "COORDINADORA", label: "Coordinadora" }, { key: "COMERCIAL", label: "Comercial" }].map((f) => (
            <button key={f.key} onClick={() => setFilterRol(f.key === filterRol ? "" : f.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${filterRol === f.key ? "bg-primary text-white" : "bg-muted text-secondary"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <Button size="md" onClick={() => setShowCrear(true)} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="Sin usuarios" description="No se encontraron usuarios" />
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const rc = rolColors[u.rol] ?? rolColors.COMERCIAL;
            const isEditing = editId === u.id;
            return (
              <div key={u.id} className={`rounded-xl border p-4 transition-all ${isEditing ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:bg-muted/30"}`}>
                {!isEditing ? (
                  <div className="flex items-center gap-4">
                    <Avatar name={`${u.nombre} ${u.apellidos}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground">{u.nombre} {u.apellidos}</p>
                      <p className="text-sm text-secondary">{u.email}</p>
                    </div>
                    <Badge variant={rc.variant} size="sm">{rc.label}</Badge>
                    <Badge variant={u.activo ? "success" : "danger"} size="sm">{u.activo ? "Activo" : "Inactivo"}</Badge>
                    <span className="text-sm text-secondary shrink-0">{formatDate(u.createdAt)}</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleActivo(u)} className="h-8 w-8 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer" title={u.activo ? "Desactivar" : "Activar"}>
                        {u.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                      <button onClick={() => startEdit(u)} className="h-8 w-8 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-xs text-secondary block mb-1">Nombre</label><input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} className={inputClass} /></div>
                      <div><label className="text-xs text-secondary block mb-1">Apellidos</label><input value={editForm.apellidos} onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })} className={inputClass} /></div>
                      <div><label className="text-xs text-secondary block mb-1">Email</label><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-secondary block mb-1">Nueva password (dejar vacio para no cambiar)</label><input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
                      <div className="flex items-end gap-2">
                        <Button variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                        <Button onClick={saveEdit} loading={saving} className="gap-2"><Check className="h-4 w-4" /> Guardar</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear */}
      {showCrear && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowCrear(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-card rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-[480px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Nuevo usuario</h2>
                <button onClick={() => setShowCrear(false)} className="h-9 w-9 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium text-secondary block mb-1">Nombre *</label><input value={crearForm.nombre} onChange={(e) => setCrearForm({ ...crearForm, nombre: e.target.value })} className={inputClass} /></div>
                  <div><label className="text-sm font-medium text-secondary block mb-1">Apellidos *</label><input value={crearForm.apellidos} onChange={(e) => setCrearForm({ ...crearForm, apellidos: e.target.value })} className={inputClass} /></div>
                </div>
                <div><label className="text-sm font-medium text-secondary block mb-1">Email *</label><input type="email" value={crearForm.email} onChange={(e) => setCrearForm({ ...crearForm, email: e.target.value })} className={inputClass} /></div>
                <div><label className="text-sm font-medium text-secondary block mb-1">Password *</label><input type="password" value={crearForm.password} onChange={(e) => setCrearForm({ ...crearForm, password: e.target.value })} className={inputClass} /></div>
                <div>
                  <label className="text-sm font-medium text-secondary block mb-1">Rol</label>
                  <div className="flex gap-2">
                    {["ADMIN", "COORDINADORA"].map((r) => (
                      <button key={r} onClick={() => setCrearForm({ ...crearForm, rol: r })}
                        className={`flex-1 h-11 rounded-lg text-sm font-semibold cursor-pointer transition-all ${crearForm.rol === r ? "bg-primary text-white" : "bg-muted text-secondary"}`}>
                        {r === "ADMIN" ? "Administrador" : "Coordinadora"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-secondary mt-1">Para crear comerciales, usa la seccion Comerciales</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <Button variant="secondary" onClick={() => setShowCrear(false)}>Cancelar</Button>
                <Button onClick={crearUsuario} loading={saving} size="lg">Crear usuario</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
