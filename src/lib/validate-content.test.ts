import { describe, expect, it } from "vitest";
import valid from "../data/content.json";
import { validateContent } from "./validate-content";

describe("validateContent", () => {
	it("accepts the seed content", () => {
		expect(validateContent(valid)).toEqual({ ok: true, errors: [] });
	});

	it("rejects a non-object", () => {
		expect(validateContent(null).ok).toBe(false);
	});

	it("rejects missing person.name", () => {
		const bad = structuredClone(valid) as any;
		delete bad.person.name;
		const res = validateContent(bad);
		expect(res.ok).toBe(false);
		expect(res.errors.join(" ")).toContain("person.name");
	});

	it("rejects when experience is not an array", () => {
		const bad = structuredClone(valid) as any;
		bad.experience = "nope";
		expect(validateContent(bad).ok).toBe(false);
	});

	it("rejects an experience entry missing achievements array", () => {
		const bad = structuredClone(valid) as any;
		bad.experience[0].achievements = "x";
		expect(validateContent(bad).ok).toBe(false);
	});
});
