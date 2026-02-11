import { NextResponse } from "next/server";
import { createAdminSessionToken, getAdminPassword } from "@/app/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string } | null;
  const password = body?.password ?? "";

  const expected = getAdminPassword();
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured on the server" },
      { status: 500 },
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}

