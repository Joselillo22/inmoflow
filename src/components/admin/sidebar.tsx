"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCircle,
  Handshake,
  ShieldCheck,
  CalendarDays,
  Inbox,
  Zap,
  Settings,
  LogOut,
  Wrench,
  UserSquare2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/leads", labelKey: "nav.leads", icon: Users },
  { href: "/inmuebles", labelKey: "nav.properties", icon: Building2 },
  { href: "/comerciales", labelKey: "nav.agents", icon: UserCircle },
  { href: "/operaciones", labelKey: "nav.operations", icon: Handshake },
  { href: "/proveedores", labelKey: "nav.suppliers", icon: Wrench },
  { href: "/calendario", labelKey: "nav.calendar", icon: CalendarDays },
  { href: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { href: "/automatizaciones", labelKey: "nav.automatizaciones", icon: Zap },
  { href: "/ajustes", labelKey: "nav.settings", icon: Settings },
  { href: "/propietarios", labelKey: "nav.owners", icon: UserSquare2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  return (
    <>
    {/* Overlay when expanded */}
    {expanded && (
      <div
        className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px] transition-opacity duration-200"
        onClick={() => setExpanded(false)}
      />
    )}
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col z-50",
        "bg-gradient-to-b from-[#0f1b3d] via-[#132252] to-[#0c1a3a]",
        "transition-all duration-250 ease-out",
        "shadow-[2px_0_16px_rgba(15,27,61,0.3)]",
        expanded ? "w-[220px]" : "w-16"
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className={cn(
        "h-14 flex items-center border-b border-white/[0.08] shrink-0",
        expanded ? "px-4 gap-3" : "justify-center"
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#1a56db] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(59,130,246,0.4)]">
          <span className="text-white text-sm font-bold">IF</span>
        </div>
        {expanded && (
          <span className="text-white font-semibold text-sm whitespace-nowrap animate-in fade-in duration-150">
            InmoFlow
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer group relative",
                    expanded ? "px-3 py-2.5" : "justify-center py-2.5 px-0",
                    isActive
                      ? "bg-gradient-to-r from-[#2563eb]/30 to-[#3b82f6]/15 text-white shadow-[0_0_12px_rgba(37,99,235,0.15)]"
                      : "text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-[#60a5fa] to-[#2563eb] rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                  )}
                  <item.icon className={cn(
                    "shrink-0 transition-all duration-200",
                    isActive ? "text-[#60a5fa] drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]" : "text-white/40 group-hover:text-white/70",
                    expanded ? "h-[18px] w-[18px]" : "h-5 w-5"
                  )} />
                  {expanded && (
                    <span className={cn(
                      "text-[13px] whitespace-nowrap animate-in fade-in duration-100",
                      isActive ? "font-semibold" : "font-medium"
                    )}>
                      {t(item.labelKey)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="py-3 px-2 border-t border-white/[0.08]">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white/70",
            "transition-all duration-200 w-full cursor-pointer",
            expanded ? "px-3 py-2.5" : "justify-center py-2.5"
          )}
        >
          <LogOut className={cn("shrink-0", expanded ? "h-[18px] w-[18px]" : "h-5 w-5")} />
          {expanded && (
            <span className="text-[13px] font-medium whitespace-nowrap animate-in fade-in duration-100">
              {t("common.logout")}
            </span>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}
