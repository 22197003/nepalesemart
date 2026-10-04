import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Edge-safe first gate: signature + role claim only. Pages/actions re-check the DB via requirePermission().
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("ng_session")?.value;
  let role: string | null = null;
  if (token && process.env.AUTH_SECRET) {
    try {
      role = String(
        (
          await jwtVerify(
            token,
            new TextEncoder().encode(process.env.AUTH_SECRET),
          )
        ).payload.role,
      );
    } catch {
      /* invalid */
    }
  }
  if (pathname.startsWith("/admin")) {
    if (!role)
      return NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url),
      );
    if (role === "CUSTOMER")
      return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
  if (pathname.startsWith("/account") && !role) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url),
    );
  }
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
