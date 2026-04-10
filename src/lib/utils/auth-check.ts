import { auth } from "@/lib/auth";

interface SessionUser {
  id: string;
  rol: string;
  comercialId: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as unknown as SessionUser;
  return user;
}

export function canAccessResource(
  user: SessionUser,
  resourceComercialId: string | null | undefined
): boolean {
  if (user.rol === "ADMIN" || user.rol === "COORDINADORA") return true;
  if (user.rol === "COMERCIAL" && user.comercialId) {
    return resourceComercialId === user.comercialId;
  }
  return false;
}
