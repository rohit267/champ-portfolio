import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
	const res = NextResponse.json({ ok: true });
	// Must match the path the cookie was set with, otherwise the browser keeps it.
	res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
	return res;
}
