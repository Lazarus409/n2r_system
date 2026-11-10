import { NextResponse, type NextRequest } from "next/server";
import { adminPassword, SESSION_COOKIE, verifySession } from "@/lib/auth";

/**
 * Protects the admin dashboard and every member-data API call.
 * Public: /register, /login, POST /api/alumni (submitting a registration) and /api/auth (logging in/out).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if (isApi && req.method === "POST" && pathname === "/api/alumni") return NextResponse.next();

  if (!adminPassword()) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next(); // open for local development
    return new NextResponse("Set ADMIN_PASSWORD to enable the admin dashboard.", { status: 503 });
  }

  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/api/alumni/:path*"] };
