import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";

export function sessionToken(password: string): string {
	return createHmac("sha256", password).update("portfolio-admin").digest("hex");
}

export function verifyToken(token: string | undefined, password: string): boolean {
	if (!token || !password) return false;
	const expected = sessionToken(password);
	const a = Buffer.from(token);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

/** Read the admin password from env; throws if unset so misconfig is loud. */
export function adminPassword(): string {
	const pw = process.env.ADMIN_PASSWORD;
	if (!pw) throw new Error("ADMIN_PASSWORD is not set");
	return pw;
}
