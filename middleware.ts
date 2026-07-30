import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/cart",
  "/community/new",
  "/library",
  "/marketplace/new",
  "/membership/checkout",
  "/membership/payment",
  "/membership/success",
  "/orders",
  "/read",
  "/reading",
  "/profile",
  "/seller",
  "/admin",
  "/dashboard",
  "/notifications",
];

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // File Ebook chỉ được đọc qua Server Action sau khi kiểm tra entitlement.
  if (pathname.startsWith("/ebooks/")) {
    return new NextResponse("Không được phép truy cập trực tiếp file Ebook.", { status: 403 });
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = typeof token.role === "string" ? token.role : "";
  if (isAdminPath(pathname) && role !== "ADMIN" && role !== "MODERATOR") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ebooks/:path*", "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
