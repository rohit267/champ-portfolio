import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, verifyToken } from "@/lib/admin-auth";
import { getContent, saveContent } from "@/lib/content";
import { resetVectorStore } from "@/lib/portfolio-rag";
import { validateContent } from "@/lib/validate-content";

export const runtime = "nodejs";

async function isAuthed(): Promise<boolean> {
	const token = (await cookies()).get(ADMIN_COOKIE)?.value;
	return verifyToken(token, adminPassword());
}

export async function GET() {
	if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	return NextResponse.json(await getContent());
}

export async function POST(request: NextRequest) {
	if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const body = await request.json().catch(() => null);
	const { ok, errors } = validateContent(body);
	if (!ok) return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
	await saveContent(body);
	resetVectorStore();
	return NextResponse.json({ ok: true });
}
