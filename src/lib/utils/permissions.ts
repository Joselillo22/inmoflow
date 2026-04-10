import type { Rol } from "@prisma/client";

export function canAccessAdmin(rol: Rol): boolean {
  return rol === "ADMIN" || rol === "COORDINADORA";
}

export function canAccessComercial(rol: Rol): boolean {
  return rol === "COMERCIAL";
}

export function isAdmin(rol: Rol): boolean {
  return rol === "ADMIN";
}
