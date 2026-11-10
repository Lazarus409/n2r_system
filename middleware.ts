import { NextResponse, type NextRequest } from "next/server";
import { devOpenAccess, readSession, SESSION_COOKIE, sessionSecret } from "@/lib/auth";

/**
 * First line of defence for the admin dashboard and member-data APIs: checks the session cookie's signature and expiry.
 * API routes additionally check the session version against the database (lib/account.ts → requireAdmin),
 * so sessions are revoked as soon as the admin password changes.
 * Public: /register, /login, POST /api/alumni (registration) and /api/auth (sign in/out).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if (isApi && req.method === "POST" && pathname === "/api/alumni") return NextResponse.next();

  if (devOpenAccess()) return NextResponse.next(); // no secret configured, local development only
  if (!sessionSecret()) return new NextResponse("Set ADMIN_PASSWORD (and SESSION_SECRET) to enable the admin dashboard.", { status: 503 });

  if ((await readSession(req.cookies.get(SESSION_COOKIE)?.value)) !== null) return NextResponse.next();

  if (isApi) return NextResponse.json({ message: "Not signed in" }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/api/alumni/:path*", "/api/audit/:path*", "/api/account/:path*"] };
