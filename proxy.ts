import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const persona = request.nextUrl.pathname === "/" ? request.nextUrl.searchParams.get("persona") : "qa";
  const appearance = request.nextUrl.searchParams.get("theme");
  const appearanceExplicit = appearance === "light" || appearance === "dark";

  requestHeaders.set("x-portfolio-persona", persona === "fullstack" ? "fullstack" : "qa");
  requestHeaders.set("x-portfolio-appearance", appearance === "light" ? "light" : "dark");
  requestHeaders.set("x-portfolio-appearance-explicit", String(appearanceExplicit));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/:path*"] };
