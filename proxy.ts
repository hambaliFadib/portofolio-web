import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const persona = request.nextUrl.pathname === "/" ? request.nextUrl.searchParams.get("persona") : "qa";
  const urlAppearance = request.nextUrl.searchParams.get("theme");
  const storedAppearance = request.cookies.get("theme")?.value;
  const appearance = urlAppearance === "light" || urlAppearance === "dark"
    ? urlAppearance
    : storedAppearance === "light" || storedAppearance === "dark"
      ? storedAppearance
      : "dark";

  requestHeaders.set("x-portfolio-persona", persona === "fullstack" ? "fullstack" : "qa");
  requestHeaders.set("x-portfolio-appearance", appearance);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/:path*"] };
