"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PortfolioContent } from "@/types/portfolio";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminForm({ initial }: { initial: PortfolioContent }) {
	const router = useRouter();
	const [data, setData] = useState<PortfolioContent>(initial);
	const [state, setState] = useState<SaveState>("idle");
	const [message, setMessage] = useState("");

	function update(mutator: (draft: PortfolioContent) => void) {
		setData((prev) => {
			const next = structuredClone(prev);
			mutator(next);
			return next;
		});
	}

	async function save() {
		setState("saving");
		setMessage("");
		const res = await fetch("/api/admin/content", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (res.ok) {
			setState("saved");
			setMessage("Saved. Public site + chat updated.");
			router.refresh();
		} else {
			const body = await res.json().catch(() => ({}));
			setState("error");
			setMessage(body.errors?.join("; ") || body.error || "Save failed.");
		}
	}

	async function logout() {
		await fetch("/api/admin/logout", { method: "POST" });
		router.push("/admin/login");
	}

	const field = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent";
	const label = "text-xs font-medium text-muted";

	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
			<datalist id="project-link-labels">
				<option value="GitHub" />
				<option value="Live Demo" />
				<option value="Website" />
				<option value="Play Store" />
				<option value="App Store" />
				<option value="Documentation" />
				<option value="Video" />
			</datalist>
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Edit portfolio</h1>
				<div className="flex items-center gap-3">
					<button type="button" onClick={logout} className="text-sm text-muted hover:text-fg">
						Log out
					</button>
					<button
						type="button"
						onClick={save}
						disabled={state === "saving"}
						className="rounded-lg bg-accent px-4 py-2 text-sm text-on-accent disabled:opacity-50"
					>
						{state === "saving" ? "Saving…" : "Save"}
					</button>
				</div>
			</div>
			{message ? (
				<p className={state === "error" ? "text-sm text-red-500" : "text-sm text-green-600"}>{message}</p>
			) : null}

			{/* Profile */}
			<fieldset className="flex flex-col gap-3">
				<legend className="mb-2 text-lg font-medium">Profile</legend>
				{(["name", "role", "email", "avatar", "location", "resumeUrl"] as const).map((key) => (
					<label key={key} className="flex flex-col gap-1">
						<span className={label}>{key === "resumeUrl" ? "resume URL (direct download)" : key}</span>
						<input
							className={field}
							value={data.person[key] ?? ""}
							onChange={(e) =>
								update((d) => {
									d.person[key] = e.target.value;
								})
							}
						/>
					</label>
				))}
				<label className="flex flex-col gap-1">
					<span className={label}>languages (comma separated)</span>
					<input
						className={field}
						value={data.person.languages.join(",")}
						onChange={(e) =>
							update((d) => {
								d.person.languages = e.target.value.split(",");
							})
						}
					/>
				</label>
			</fieldset>

			{/* About */}
			<fieldset className="flex flex-col gap-2">
				<legend className="mb-2 text-lg font-medium">About</legend>
				<textarea
					className={`${field} min-h-28`}
					value={data.about.intro}
					onChange={(e) =>
						update((d) => {
							d.about.intro = e.target.value;
						})
					}
				/>
			</fieldset>

			{/* Social */}
			<ArrayEditor
				legend="Social links"
				items={data.social}
				onAdd={() =>
					update((d) => {
						d.social.push({ name: "", icon: "github", link: "" });
					})
				}
				onRemove={(i) =>
					update((d) => {
						d.social.splice(i, 1);
					})
				}
				render={(s, i) => (
					<div className="grid grid-cols-3 gap-2">
						{(["name", "icon", "link"] as const).map((k) => (
							<input
								key={k}
								className={field}
								placeholder={k}
								value={s[k]}
								onChange={(e) =>
									update((d) => {
										d.social[i][k] = e.target.value;
									})
								}
							/>
						))}
					</div>
				)}
			/>

			{/* Skills */}
			<ArrayEditor
				legend="Skills"
				items={data.skills}
				onAdd={() =>
					update((d) => {
						d.skills.push({ title: "", description: "", tags: [] });
					})
				}
				onRemove={(i) =>
					update((d) => {
						d.skills.splice(i, 1);
					})
				}
				render={(sk, i) => (
					<div className="flex flex-col gap-2">
						<input
							className={field}
							placeholder="title"
							value={sk.title}
							onChange={(e) =>
								update((d) => {
									d.skills[i].title = e.target.value;
								})
							}
						/>
						<textarea
							className={`${field} min-h-16`}
							placeholder="description"
							value={sk.description}
							onChange={(e) =>
								update((d) => {
									d.skills[i].description = e.target.value;
								})
							}
						/>
						<input
							className={field}
							placeholder="tags (comma separated)"
							value={sk.tags.map((t) => t.name).join(",")}
							onChange={(e) =>
								update((d) => {
									// Keep icons already chosen for a tag; only new names get the default.
									const icons = new Map(d.skills[i].tags.map((t) => [t.name.trim(), t.icon]));
									d.skills[i].tags = e.target.value
										.split(",")
										.map((name) => ({ name, icon: icons.get(name.trim()) ?? "rocket" }));
								})
							}
						/>
					</div>
				)}
			/>

			{/* Experience */}
			<ArrayEditor
				legend="Experience"
				items={data.experience}
				onAdd={() =>
					update((d) => {
						d.experience.push({ company: "", role: "", timeframe: "", achievements: [""] });
					})
				}
				onRemove={(i) =>
					update((d) => {
						d.experience.splice(i, 1);
					})
				}
				render={(exp, i) => (
					<div className="flex flex-col gap-2">
						{(["company", "role", "timeframe"] as const).map((k) => (
							<input
								key={k}
								className={field}
								placeholder={k}
								value={exp[k]}
								onChange={(e) =>
									update((d) => {
										d.experience[i][k] = e.target.value;
									})
								}
							/>
						))}
						<textarea
							className={`${field} min-h-20`}
							placeholder="achievements (one per line)"
							value={exp.achievements.join("\n")}
							onChange={(e) =>
								update((d) => {
									d.experience[i].achievements = e.target.value.split("\n");
								})
							}
						/>
					</div>
				)}
			/>

			{/* Projects */}
			<ArrayEditor
				legend="Projects"
				items={data.projects}
				onAdd={() =>
					update((d) => {
						d.projects.push({ title: "", description: "", tags: [], links: [] });
					})
				}
				onRemove={(i) =>
					update((d) => {
						d.projects.splice(i, 1);
					})
				}
				render={(p, i) => (
					<div className="flex flex-col gap-2">
						<input
							className={field}
							placeholder="title"
							value={p.title}
							onChange={(e) =>
								update((d) => {
									d.projects[i].title = e.target.value;
								})
							}
						/>
						<textarea
							className={`${field} min-h-20`}
							placeholder="description (markdown)"
							value={p.description}
							onChange={(e) =>
								update((d) => {
									d.projects[i].description = e.target.value;
								})
							}
						/>
						<input
							className={field}
							placeholder="tags (comma separated)"
							value={p.tags.join(",")}
							onChange={(e) =>
								update((d) => {
									d.projects[i].tags = e.target.value.split(",");
								})
							}
						/>
						<div className="flex flex-col gap-2 rounded-lg border border-border p-2">
							<div className="flex items-center justify-between">
								<span className={label}>links</span>
								<button
									type="button"
									className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-card"
									onClick={() =>
										update((d) => {
											d.projects[i].links.push({ label: "", url: "" });
										})
									}
								>
									+ Add link
								</button>
							</div>
							{p.links.map((lnk, j) => (
								<div key={j} className="flex flex-wrap items-center gap-2">
									<input
										className={`${field} w-full shrink-0 sm:w-36`}
										list="project-link-labels"
										placeholder="label"
										value={lnk.label}
										onChange={(e) =>
											update((d) => {
												d.projects[i].links[j].label = e.target.value;
											})
										}
									/>
									<input
										className={`${field} w-auto min-w-0 flex-1`}
										type="url"
										placeholder="https://…"
										value={lnk.url}
										onChange={(e) =>
											update((d) => {
												d.projects[i].links[j].url = e.target.value;
											})
										}
									/>
									<button
										type="button"
										aria-label="Remove link"
										className="shrink-0 px-2 text-xs text-red-500 hover:underline"
										onClick={() =>
											update((d) => {
												d.projects[i].links.splice(j, 1);
											})
										}
									>
										✕
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			/>

			{/* Education */}
			<ArrayEditor
				legend="Education"
				items={data.education}
				onAdd={() =>
					update((d) => {
						d.education.push({ name: "", description: "" });
					})
				}
				onRemove={(i) =>
					update((d) => {
						d.education.splice(i, 1);
					})
				}
				render={(ed, i) => (
					<div className="flex flex-col gap-2">
						<input
							className={field}
							placeholder="name"
							value={ed.name}
							onChange={(e) =>
								update((d) => {
									d.education[i].name = e.target.value;
								})
							}
						/>
						<input
							className={field}
							placeholder="description"
							value={ed.description}
							onChange={(e) =>
								update((d) => {
									d.education[i].description = e.target.value;
								})
							}
						/>
					</div>
				)}
			/>
		</main>
	);
}

function ArrayEditor<T>({
	legend,
	items,
	render,
	onAdd,
	onRemove,
}: {
	legend: string;
	items: T[];
	render: (item: T, index: number) => React.ReactNode;
	onAdd: () => void;
	onRemove: (index: number) => void;
}) {
	return (
		<fieldset className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<legend className="text-lg font-medium">{legend}</legend>
				<button
					type="button"
					onClick={onAdd}
					className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-card"
				>
					+ Add
				</button>
			</div>
			{items.map((item, i) => (
				<div key={i} className="rounded-xl border border-border p-3">
					<div className="mb-2 flex justify-end">
						<button
							type="button"
							onClick={() => onRemove(i)}
							className="text-xs text-red-500 hover:underline"
						>
							Remove
						</button>
					</div>
					{render(item, i)}
				</div>
			))}
		</fieldset>
	);
}
