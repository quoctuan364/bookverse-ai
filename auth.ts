import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import type { UserRole } from "@prisma/client";
import {
  authLoginRateLimiter,
  createLoginRateLimitKey,
  readLoginClientIp,
} from "@/lib/auth-rate-limit";

// Hash giả giúp thời gian xử lý email không tồn tại gần với mật khẩu sai.
const INVALID_PASSWORD_HASH =
  "$2b$10$HU.Bd6NHdc8sda8MUj7bWekBtFc2tVIu14jbNrO6UWD9ZfT4Pjb0O";

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
    async authorize(credentials, request) {
      const [{ default: bcrypt }, { default: prisma }] = await Promise.all([
        import("bcrypt"),
        import("@/lib/prisma"),
      ]);
      const email = readCredential(credentials?.email).toLowerCase();
      // Mật khẩu phải giữ nguyên như khi đăng ký, kể cả khoảng trắng.
      const password = typeof credentials?.password === "string" ? credentials.password : "";

      if (!email || !password) {
        return null;
      }

      const rateLimitKey = createLoginRateLimitKey(
        email,
        readLoginClientIp(request.headers),
      );
      if (!authLoginRateLimiter.allow(rateLimitKey)) return null;

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

      const passwordHash = user?.password ?? INVALID_PASSWORD_HASH;
      const isValidPassword = await bcrypt.compare(password, passwordHash);

      if (!user?.password || !user.email || user.isLocked || !isValidPassword) {
        authLoginRateLimiter.recordFailure(rateLimitKey);
        return null;
      }

      authLoginRateLimiter.recordSuccess(rateLimitKey);

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

const googleClientId = process.env.AUTH_GOOGLE_ID?.trim();
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();

// Chỉ hiện đăng nhập Google khi máy chủ đã được cấp đủ khóa OAuth.
if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
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
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim().toLowerCase();
      const googleProfile = profile as { email_verified?: boolean } | undefined;
      if (!email || googleProfile?.email_verified !== true) return false;

      const { default: prisma } = await import("@/lib/prisma");
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, role: true, isLocked: true },
      });

      if (existingUser?.isLocked) return false;

      const databaseUser = existingUser
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              lastActiveAt: new Date(),
              name: existingUser.name || user.name || email.split("@")[0],
            },
            select: { id: true, role: true },
          })
        : await prisma.user.create({
            data: {
              id: `USER-${crypto.randomUUID()}`,
              email,
              name: user.name?.trim() || email.split("@")[0],
              lastActiveAt: new Date(),
            },
            select: { id: true, role: true },
          });

      // JWT phải dùng mã người dùng nội bộ, không dùng mã tài khoản Google.
      user.id = databaseUser.id;
      user.role = databaseUser.role;
      return true;
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
