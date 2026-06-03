import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminPassword, verifyToken } from "@/lib/admin-auth";
import { getContent } from "@/lib/content";
import { AdminForm } from "./AdminForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
	const token = (await cookies()).get(ADMIN_COOKIE)?.value;
	if (!verifyToken(token, adminPassword())) redirect("/admin/login");
	const content = await getContent();
	return <AdminForm initial={content} />;
}
