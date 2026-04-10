"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { LanguageSelector } from "@/components/shared/language-selector";

export function ComercialHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border z-30 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">IF</span>
        </div>
        <span className="text-sm font-bold text-foreground">InmoFlow</span>
      </div>
      <div className="flex items-center gap-3">
        <LanguageSelector variant="mobile" />
        <Avatar name={session?.user?.name ?? "U"} size="sm" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-1.5 rounded-lg text-secondary hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
          aria-label="Cerrar sesion"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
