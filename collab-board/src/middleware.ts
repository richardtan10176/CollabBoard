// src/middleware.ts
import { NextResponse, NextRequest } from "next/server";

// Cookie name set by your backend after successful login
const SESSION_COOKIE = "sid";

// Public paths (always accessible)
const PUBLIC_PATHS = ["/", "/auth", "/p", "/api"];

// Paths considered "protected"
function isProtectedPath(pathname: string) {
  // Everything NOT starting with a known public segment is protected by default,
  // plus explicit protected root paths.
  if (pathname === "/main") return true;
  if (pathname.startsWith("/w/")) return true;
  if (pathname.startsWith("/b/")) return true;
  if (pathname.startsWith("/n/")) return true;

  // Public roots
  if (pathname === "/") return false;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return false;
  if (pathname.startsWith("/p/")) return false;

  // Default: treat as protected (tighten by default)
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sid = req.cookies.get(SESSION_COOKIE)?.value;

  // If authenticated users hit public entry points → send to /main
  const isPublicRoot =
    pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/");
  if (sid && isPublicRoot) {
    const url = req.nextUrl.clone();
    url.pathname = "/main";
    return NextResponse.redirect(url);
  }

  // If unauthenticated users hit protected pages → send to /auth
  if (!sid && isProtectedPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    // Preserve where they tried to go, so you can redirect post-login
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Otherwise allow through
  return NextResponse.next();
}

// Only run middleware on app routes (avoid _next and static assets)
export const config = {
  matcher: [
    // skip Next internals, static assets, and API routes
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
