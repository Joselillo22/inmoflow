import type { Rol } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      rol: Rol;
      comercialId: string | null;
    };
  }

  interface User {
    rol: Rol;
    comercialId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol: Rol;
    comercialId: string | null;
  }
}
