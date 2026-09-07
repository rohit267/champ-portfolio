import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, sessionToken, verifyToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
// ponytail: in-memory throttle, correct for a single Node process. Move to Redis if this ever runs multi-instance.
const attempts = new Map<string, { count: number; until: number }>();

function clientIp(request: NextRequest): string {
	return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isLockedOut(ip: string): boolean {
	const record = attempts.get(ip);
	if (!record) return false;
	if (Date.now() > record.until) {
		attempts.delete(ip);
		return false;
	}
	return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
	const record = attempts.get(ip);
	const live = record && Date.now() <= record.until;
	attempts.set(ip, { count: live ? record.count + 1 : 1, until: live ? record.until : Date.now() + WINDOW_MS });
}

export async function POST(request: NextRequest) {
	const ip = clientIp(request);
	if (isLockedOut(ip)) {
		return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
	}

	const { password } = (await request.json().catch(() => ({}))) as { password?: string };
	// Compare HMACs rather than raw strings so the check is constant-time.
	if (!password || !verifyToken(sessionToken(password), adminPassword())) {
		recordFailure(ip);
		return NextResponse.json({ error: "Invalid password." }, { status: 401 });
	}

	attempts.delete(ip);
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
