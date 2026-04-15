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
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/leads", labelKey: "nav.leads", icon: Users },
  { href: "/captacion", labelKey: "nav.captacion", icon: Target },
  { href: "/inmuebles", labelKey: "nav.properties", icon: Building2 },
  { href: "/propietarios", labelKey: "nav.owners", icon: UserSquare2 },
  { href: "/comerciales", labelKey: "nav.agents", icon: UserCircle },
  { href: "/operaciones", labelKey: "nav.operations", icon: Handshake },
  { href: "/proveedores", labelKey: "nav.suppliers", icon: Wrench },
  { href: "/calendario", labelKey: "nav.calendar", icon: CalendarDays },
  { href: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { href: "/automatizaciones", labelKey: "nav.automatizaciones", icon: Zap },
  { href: "/ajustes", labelKey: "nav.settings", icon: Settings },
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
        className="fixed inset-0 z-40 bg-black/5 transition-opacity duration-200"
        onClick={() => setExpanded(false)}
      />
    )}
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col z-50",
        "bg-white/80 backdrop-blur-xl border-r border-slate-200/80",
        "transition-all duration-250 ease-out",
        "shadow-[2px_0_16px_rgba(0,0,0,0.04)]",
        expanded ? "w-[220px]" : "w-16"
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className={cn(
        "h-14 flex items-center border-b border-slate-200/60 shrink-0",
        expanded ? "px-4 gap-3" : "justify-center"
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#1a56db] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(59,130,246,0.4)]">
          <span className="text-white text-sm font-bold">IF</span>
        </div>
        {expanded && (
          <span className="text-slate-800 font-semibold text-sm whitespace-nowrap animate-in fade-in duration-150">
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
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "shrink-0 transition-all duration-200",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500",
                    expanded ? "h-[18px] w-[18px]" : "h-5 w-5"
                  )} />
                  {expanded && (
                    <span className={cn(
                      "text-[13px] whitespace-nowrap animate-in fade-in duration-100",
                      isActive ? "font-semibold text-blue-700" : "font-medium text-slate-600"
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
      <div className="py-3 px-2 border-t border-slate-200/60">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500",
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
