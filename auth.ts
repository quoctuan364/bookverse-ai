import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: UserRole;
  }
}

function readCredential(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const [{ default: bcrypt }, { default: prisma }] = await Promise.all([
          import("bcrypt"),
          import("@/lib/prisma"),
        ]);
        const email = readCredential(credentials?.email).toLowerCase();
        const password = readCredential(credentials?.password);

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            isLocked: true,
          },
        });

        if (!user?.password || !user.email || user.isLocked) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return null;
        }

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            lastActiveAt: new Date(),
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const nextToken = token as typeof token & { id?: string; role?: UserRole };
        nextToken.id = user.id;
        nextToken.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      const currentToken = token as typeof token & { id?: string; role?: UserRole };

      if (session.user && typeof currentToken.id === "string") {
        session.user.id = currentToken.id;
      }

      if (session.user && currentToken.role) {
        session.user.role = currentToken.role;
      }

      return session;
    },
  },
});
