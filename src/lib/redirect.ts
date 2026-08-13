import { NextRequest, NextResponse } from "next/server";

export function getAppOrigin(request: NextRequest) {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      throw new Error("APP_URL non valido. Usa un URL completo, per esempio http://192.168.1.50:3000.");
    }
  }

  return request.nextUrl.origin;
}

export function appUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, getAppOrigin(request));
}

export function redirectTo(request: NextRequest, pathname: string, status = 303) {
  return NextResponse.redirect(appUrl(request, pathname), { status });
}
