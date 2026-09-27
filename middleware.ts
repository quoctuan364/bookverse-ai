import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getCanonicalAdminPath,
  isAdminPath,
  isProtectedPath,
} from "@/lib/route-access-policy";

const VISITOR_COOKIE = "bookverse_visitor_id";
const VISITOR_ID_PATTERN = /^[a-f0-9-]{20,80}$/iu;

function requestIdFor(request: NextRequest): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[a-zA-Z0-9._-]{8,80}$/u.test(supplied) ? supplied : crypto.randomUUID();
}

function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("x-request-id", requestId);
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = requestIdFor(request);

  // File Ebook chỉ được đọc qua Server Action sau khi kiểm tra entitlement.
  if (pathname.startsWith("/ebooks/")) {
    return withRequestId(
      new NextResponse("Không được phép truy cập trực tiếp file Ebook.", { status: 403 }),
      requestId,
    );
  }

  const canonicalAdminPath = getCanonicalAdminPath(pathname);
  if (canonicalAdminPath) {
    return withRequestId(
      NextResponse.redirect(new URL(canonicalAdminPath, request.url)),
      requestId,
    );
  }

  if (!isProtectedPath(pathname)) {
    const requestHeaders = new Headers(request.headers);
    const currentVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
    const visitorId = currentVisitorId && VISITOR_ID_PATTERN.test(currentVisitorId)
      ? currentVisitorId
      : crypto.randomUUID();
    requestHeaders.set("x-request-id", requestId);
    requestHeaders.set("x-bookverse-visitor-id", visitorId);
    const response = NextResponse.next({ request: { headers: requestHeaders } });

    if (visitorId !== currentVisitorId) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return withRequestId(response, requestId);
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return withRequestId(NextResponse.redirect(loginUrl), requestId);
  }

  const role = typeof token.role === "string" ? token.role : "";
  if (isAdminPath(pathname) && role !== "ADMIN" && role !== "MODERATOR") {
    return withRequestId(NextResponse.redirect(new URL("/", request.url)), requestId);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
}

export const config = {
  matcher: ["/ebooks/:path*", "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
