"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Get CSRF token on mount
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken))
      .catch(() => {});

    // Check if redirected with error
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setError(true);
  }, []);

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] bg-sidebar-bg flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white text-lg font-bold">IF</span>
            </div>
            <span className="text-white text-xl font-bold">InmoFlow</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            CRM Inmobiliario<br />
            <span className="text-primary">profesional</span>
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            Gestiona tu cartera de inmuebles, leads y operaciones. Todo desde un solo lugar.
          </p>
          <div className="w-12 h-1 bg-primary rounded-full mt-8 mb-4" />
          <p className="text-white/30 text-sm">Provincia de Alicante</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 bg-card">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white text-lg font-bold">IF</span>
            </div>
            <span className="text-foreground text-xl font-bold">InmoFlow</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Iniciar sesion</h1>
          <p className="text-secondary text-sm mb-8">Introduce tus credenciales para acceder</p>

          {/* Pure HTML form - browser handles everything including cookies */}
          <form
            method="POST"
            action="/api/auth/callback/credentials"
            className="flex flex-col gap-5"
          >
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value="/dashboard" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-foreground">Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-border bg-card text-foreground placeholder:text-secondary/40 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 h-11 px-3.5 text-base pl-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-foreground">Contrasena</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Tu contrasena"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-card text-foreground placeholder:text-secondary/40 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 h-11 px-3.5 text-base pl-9 pr-9"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60">
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="cursor-pointer hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger-light text-danger text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                Email o contrasena incorrectos
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-1">
              Entrar
            </Button>
          </form>

          <p className="text-center text-xs text-secondary/40 mt-10">
            Powered by ENTRA CRM
          </p>
        </div>
      </div>
    </div>
  );
}
