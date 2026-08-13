import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { appUrl, redirectTo } from "@/lib/redirect";

const PUBLIC_PATHS = new Set(["/login"]);

function isStaticAsset(pathname: string) {
  return /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)$/.test(pathname);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/api/health" ||
    pathname === "/favicon.ico" ||
    isStaticAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (PUBLIC_PATHS.has(pathname)) {
    if (session) {
      return redirectTo(request, "/dashboard", 307);
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = appUrl(request, "/login");
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
