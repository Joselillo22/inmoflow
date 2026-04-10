"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import { UsuariosTab } from "@/components/admin/ajustes/tabs/usuarios-tab";
import { PerfilTab } from "@/components/admin/ajustes/tabs/perfil-tab";
import { IntegracionesTab } from "@/components/admin/ajustes/tabs/integraciones-tab";
import { SistemaTab } from "@/components/admin/ajustes/tabs/sistema-tab";

const tabs = [
  { id: "usuarios", label: "Usuarios" },
  { id: "perfil", label: "Mi Perfil" },
  { id: "integraciones", label: "Integraciones" },
  { id: "sistema", label: "Sistema" },
];

export default function AjustesPage() {
  const [activeTab, setActiveTab] = useState("usuarios");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-secondary" />
        <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-5" />
        <div>
          {activeTab === "usuarios" && <UsuariosTab />}
          {activeTab === "perfil" && <PerfilTab />}
          {activeTab === "integraciones" && <IntegracionesTab />}
          {activeTab === "sistema" && <SistemaTab />}
        </div>
      </div>
    </div>
  );
}
