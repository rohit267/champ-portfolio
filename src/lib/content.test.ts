import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import seed from "../data/content.json";
import { _setContentPathForTests, getContent, saveContent } from "./content";

let tmp: string | undefined;

afterEach(() => {
	if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp);
	tmp = undefined;
});

function freshFile() {
	tmp = path.join(os.tmpdir(), `content-${process.hrtime.bigint()}.json`);
	fs.writeFileSync(tmp, JSON.stringify(seed));
	_setContentPathForTests(tmp);
	return tmp;
}

describe("content.ts", () => {
	it("reads content from disk", async () => {
		freshFile();
		const c = await getContent();
		expect(c.person.name).toBe("Rohit Mahto");
	});

	it("round-trips a save", async () => {
		freshFile();
		const c = await getContent();
		c.person.role = "Updated Role";
		await saveContent(c);
		const again = await getContent();
		expect(again.person.role).toBe("Updated Role");
	});

	it("trims and drops empty entries in the free-text list fields", async () => {
		freshFile();
		const c = await getContent();
		c.skills[0].tags = [
			{ name: " React ", icon: "react" },
			{ name: "", icon: "rocket" },
		];
		c.projects[0].tags = [" Next.js ", ""];
		c.experience[0].achievements = [" shipped it ", ""];
		c.person.languages = [" English ", ""];
		await saveContent(c);
		const again = await getContent();
		expect(again.skills[0].tags).toEqual([{ name: "React", icon: "react" }]);
		expect(again.projects[0].tags).toEqual(["Next.js"]);
		expect(again.experience[0].achievements).toEqual(["shipped it"]);
		expect(again.person.languages).toEqual(["English"]);
	});

	it("rejects invalid content without writing", async () => {
		const file = freshFile();
		const before = fs.readFileSync(file, "utf8");
		await expect(saveContent({ person: {} } as any)).rejects.toThrow();
		expect(fs.readFileSync(file, "utf8")).toBe(before);
	});
});
