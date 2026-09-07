"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setBusy(true);
		try {
			const res = await fetch("/api/admin/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password }),
			});
			if (res.ok) {
				// Drop the cached RSC payload of /admin, which still holds the redirect to this page.
				router.refresh();
				router.push("/admin");
				return;
			}
			const body = await res.json().catch(() => ({}));
			setError(body.error || "Login failed.");
		} catch {
			setError("Network error. Try again.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
			<h1 className="text-xl font-semibold">Admin login</h1>
			<form onSubmit={submit} className="flex flex-col gap-3">
				<input
					type="password"
					name="password"
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Password"
					className="rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
				/>
				<button
					type="submit"
					disabled={busy}
					className="rounded-lg bg-accent px-4 py-2 text-on-accent disabled:opacity-50"
				>
					{busy ? "Logging in…" : "Log in"}
				</button>
				{error ? <p className="text-sm text-red-500">{error}</p> : null}
			</form>
		</main>
	);
}
