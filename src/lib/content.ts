import fs from "node:fs/promises";
import path from "node:path";
import type { PortfolioContent } from "@/types/portfolio";
import { assertContent } from "./validate-content";

let contentPath = path.join(process.cwd(), "src", "data", "content.json");

/** Test-only hook to point at a temp file. */
export function _setContentPathForTests(p: string) {
	contentPath = p;
}

export async function getContent(): Promise<PortfolioContent> {
	const raw = await fs.readFile(contentPath, "utf8");
	const data = JSON.parse(raw);
	assertContent(data);
	return data;
}

/** Trim the free-text list fields an editor keeps verbatim while typing. */
function normalize(c: PortfolioContent): PortfolioContent {
	c.person.languages = c.person.languages.map((l) => l.trim()).filter(Boolean);
	for (const group of c.skills) {
		group.tags = group.tags.map((t) => ({ ...t, name: t.name.trim() })).filter((t) => t.name);
	}
	for (const project of c.projects) {
		project.tags = project.tags.map((t) => t.trim()).filter(Boolean);
	}
	for (const exp of c.experience) {
		exp.achievements = exp.achievements.map((a) => a.trim()).filter(Boolean);
	}
	return c;
}

/**
 * rename() cannot replace a mount point. Docker single-file bind mounts
 * (-v ./content.json:/app/src/data/content.json) therefore fail with EBUSY,
 * and a mount whose backing store differs from the image layer can give EXDEV.
 */
function cannotReplaceByRename(err: unknown): boolean {
	const code = (err as NodeJS.ErrnoException)?.code;
	return code === "EBUSY" || code === "EXDEV" || code === "EPERM";
}

export async function saveContent(input: unknown): Promise<PortfolioContent> {
	assertContent(input);
	const data = normalize(structuredClone(input));
	const serialized = `${JSON.stringify(data, null, 2)}\n`;
	const tmp = `${contentPath}.tmp`;
	await fs.writeFile(tmp, serialized, "utf8");
	try {
		await fs.rename(tmp, contentPath);
	} catch (err) {
		if (!cannotReplaceByRename(err)) {
			await fs.rm(tmp, { force: true });
			throw err;
		}
		// Write through the mount instead of replacing it. Not atomic, so a crash
		// mid-write can truncate the file; mount the directory, not the file, to
		// keep the rename path. ponytail: no lock, single writer (one admin).
		await fs.copyFile(tmp, contentPath);
		await fs.rm(tmp, { force: true });
	}
	return data;
}
