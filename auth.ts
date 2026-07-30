import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import type { UserRole } from "@prisma/client";
import { isGoogleAuthConfigured, parseVerifiedGoogleIdentity } from "@/lib/google-auth";

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

const providers: Provider[] = [
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
];

if (isGoogleAuthConfigured()) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        return true;
      }

      const identity = parseVerifiedGoogleIdentity(profile);
      if (!identity) {
        return false;
      }

      try {
        const { default: prisma } = await import("@/lib/prisma");
        const existingUser = await prisma.user.findUnique({
          where: { email: identity.email },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isLocked: true,
          },
        });

        if (existingUser?.isLocked) {
          return false;
        }

        const localUser = existingUser
          ? await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                lastActiveAt: new Date(),
                profile: identity.picture
                  ? {
                      upsert: {
                        create: { avatarUrl: identity.picture },
                        update: { avatarUrl: identity.picture },
                      },
                    }
                  : undefined,
              },
              select: { id: true, name: true, email: true, role: true },
            })
          : await prisma.user.create({
              data: {
                id: `USER-${crypto.randomUUID()}`,
                email: identity.email,
                name: identity.name,
                role: "BUYER",
                lastActiveAt: new Date(),
                profile: identity.picture
                  ? {
                      create: { avatarUrl: identity.picture },
                    }
                  : undefined,
              },
              select: { id: true, name: true, email: true, role: true },
            });

        // Auth.js dùng đối tượng này ở callback JWT ngay sau khi đăng nhập.
        user.id = localUser.id;
        user.name = localUser.name;
        user.email = localUser.email;
        user.image = identity.picture;
        user.role = localUser.role;
        return true;
      } catch {
        console.error("[auth:google] Không thể đồng bộ tài khoản Google với tài khoản BookVerse.");
        return false;
      }
    },
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
