import { NextResponse } from "next/server";
import { getAccount, requireAdmin, updateProfile } from "@/lib/account";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/account -> the signed-in admin's profile
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const a = getAccount();
  return a ? NextResponse.json(a) : NextResponse.json({ message: "Sign in once with ADMIN_PASSWORD to create the admin account." }, { status: 404 });
}

// PATCH /api/account { name, email, phone } -> update profile
export async function PATCH(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  if (!getAccount()) return NextResponse.json({ message: "Admin account not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const clean = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  const p = { name: clean(body.name, 80), email: clean(body.email, 120).toLowerCase(), phone: clean(body.phone, 20).replace(/[\s()-]/g, "") };

  const errors: Record<string, string> = {};
  if (p.name.length < 2) errors.name = "Enter a name.";
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) errors.email = "Enter a valid email address.";
  if (p.phone && !/^(\+?\d{10,15}|0\d{9})$/.test(p.phone)) errors.phone = "Enter a valid phone number.";
  if (Object.keys(errors).length) return NextResponse.json({ message: "Please correct the highlighted fields.", errors }, { status: 400 });

  return NextResponse.json(updateProfile(p));
}
