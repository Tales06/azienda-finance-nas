import { NextRequest } from "next/server";
import { sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const response = redirectTo(request, "/login");
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0
  });
  return response;
}
