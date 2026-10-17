import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/masteros")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/";
  const mosPath = pathname === "/masteros" ? "" : pathname.replace(/^\/masteros\/?/, "");
  const preserved = new URLSearchParams(request.nextUrl.search);
  url.search = "";
  url.searchParams.set("view", "masteros");
  if (mosPath) url.searchParams.set("mos", mosPath);
  preserved.forEach((value, key) => {
    if (key === "view" || key === "mos") return;
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/masteros", "/masteros/:path*"],
};
