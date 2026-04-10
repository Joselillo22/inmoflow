import { prisma } from "@/lib/prisma";

interface AuditParams {
  userId?: string | null;
  userEmail?: string | null;
  userRol?: string | null;
  accion: "CREAR" | "ACTUALIZAR" | "ELIMINAR";
  entidad: string;
  entidadId?: string | null;
  cambios?: Record<string, { antes: unknown; despues: unknown }> | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

const SENSITIVE_FIELDS = ["passwordHash", "password", "token", "secret", "sessionToken"];
const AUTO_FIELDS = ["updatedAt", "createdAt"];

export async function audit(params: AuditParams): Promise<void> {
  const cleanCambios = params.cambios ? cleanSensitive(params.cambios) : null;

  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        userRol: params.userRol ?? null,
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId ?? null,
        cambios: cleanCambios as object ?? undefined,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata as object ?? undefined,
      },
    });
  } catch {
    // Audit failure must not propagate
  }
}

export function diffChanges(
  antes: Record<string, unknown>,
  despues: Record<string, unknown>
): Record<string, { antes: unknown; despues: unknown }> | null {
  const diff: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const key of Object.keys(despues)) {
    if (SENSITIVE_FIELDS.includes(key) || AUTO_FIELDS.includes(key)) continue;
    if (JSON.stringify(antes[key]) !== JSON.stringify(despues[key])) {
      diff[key] = { antes: antes[key] ?? null, despues: despues[key] };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

function cleanSensitive(
  cambios: Record<string, { antes: unknown; despues: unknown }>
): Record<string, { antes: unknown; despues: unknown }> {
  const clean: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const [key, val] of Object.entries(cambios)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      clean[key] = { antes: "[REDACTED]", despues: "cambiado" };
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export function extractRequestInfo(headers: Headers): { ip: string; userAgent: string } {
  const forwarded = headers.get("x-forwarded-for");
  const real = headers.get("x-real-ip");
  return {
    ip: forwarded?.split(",")[0]?.trim() ?? real ?? "unknown",
    userAgent: headers.get("user-agent") ?? "unknown",
  };
}
