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

export async function saveContent(data: unknown): Promise<PortfolioContent> {
	assertContent(data);
	const serialized = `${JSON.stringify(data, null, 2)}\n`;
	const tmp = `${contentPath}.tmp`;
	await fs.writeFile(tmp, serialized, "utf8");
	await fs.rename(tmp, contentPath);
	return data;
}
