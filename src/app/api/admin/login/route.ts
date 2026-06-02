import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, sessionToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const { password } = (await request.json().catch(() => ({}))) as { password?: string };
	if (!password || password !== adminPassword()) {
		return NextResponse.json({ error: "Invalid password." }, { status: 401 });
	}
	const res = NextResponse.json({ ok: true });
	res.cookies.set(ADMIN_COOKIE, sessionToken(adminPassword()), {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 7,
	});
	return res;
}
