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

export async function saveContent(input: unknown): Promise<PortfolioContent> {
	assertContent(input);
	const data = normalize(structuredClone(input));
	const serialized = `${JSON.stringify(data, null, 2)}\n`;
	const tmp = `${contentPath}.tmp`;
	await fs.writeFile(tmp, serialized, "utf8");
	await fs.rename(tmp, contentPath);
	return data;
}
