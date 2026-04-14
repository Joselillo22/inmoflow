"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Users, Building2, Calendar, Calculator } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "react-i18next";

const navItems = [
  { href: "/mi-dia", labelKey: "comercial.myDay", icon: CalendarCheck },
  { href: "/contactos", labelKey: "comercial.contacts", icon: Users },
  { href: "/pisos", labelKey: "comercial.myProperties", icon: Building2 },
  { href: "/agenda", labelKey: "comercial.agenda", icon: Calendar },
  { href: "/calculadora-fiscal", labelKey: "comercial.fiscalCalc", icon: Calculator },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <ul className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 relative cursor-pointer",
                  "transition-all duration-200",
                  isActive ? "text-primary" : "text-secondary"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <item.icon className={cn(
                  "transition-all duration-200",
                  isActive ? "h-6 w-6" : "h-5 w-5"
                )} />
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}>
                  {t(item.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
