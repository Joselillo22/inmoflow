import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas (jornada laboral)
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
          include: { comercial: true },
        });

        if (!user || !user.activo) return null;

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.nombre} ${user.apellidos}`,
          rol: user.rol,
          comercialId: user.comercial?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { rol: string; comercialId: string | null };
        (token as Record<string, unknown>).rol = u.rol;
        (token as Record<string, unknown>).comercialId = u.comercialId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        const s = session.user as unknown as { rol: unknown; comercialId: unknown };
        s.rol = token.rol;
        s.comercialId = token.comercialId;
      }
      return session;
    },
  },
});
