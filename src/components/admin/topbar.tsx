"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { LanguageSelector } from "@/components/shared/language-selector";
import { NotificationsDropdown } from "@/components/admin/notifications-dropdown";

const pathLabelKeys: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/leads": "nav.leads",
  "/inmuebles": "nav.properties",
  "/comerciales": "nav.agents",
  "/operaciones": "nav.operations",
  "/calendario": "nav.calendar",
  "/inbox": "nav.inbox",
  "/automatizaciones": "nav.automatizaciones",
  "/ajustes": "nav.settings",
  "/kyc": "nav.kyc",
};

export function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { t } = useTranslation();

  const labelKey =
    Object.entries(pathLabelKeys).find(([path]) => pathname.startsWith(path))?.[1] ??
    null;
  const pageLabel = labelKey ? t(labelKey) : "InmoFlow";

  return (
    <header className="h-14 bg-gradient-to-r from-[#1a56db] via-[#2563eb] to-[#3b82f6] flex items-center px-6 gap-4 shrink-0 shadow-[0_2px_12px_rgba(26,86,219,0.15)]">
      <h1 className="text-sm font-semibold text-white">{pageLabel}</h1>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:flex">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
        <input
          type="text"
          placeholder={t("common.searchPlaceholder")}
          className="h-8 w-56 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm pl-8 pr-3 text-xs text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white/30 focus:outline-none transition-all"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-mono">/</kbd>
      </div>

      {/* Language */}
      <LanguageSelector variant="topbar" />

      {/* Notifications */}
      <NotificationsDropdown />

      {/* User */}
      <div className="flex items-center gap-2.5">
        <Avatar name={session?.user?.name ?? "U"} size="md" />
        <span className="text-xs font-medium text-white/90 hidden lg:block">
          {session?.user?.name?.split(" ").slice(0, 2).join(" ")}
        </span>
      </div>
    </header>
  );
}
