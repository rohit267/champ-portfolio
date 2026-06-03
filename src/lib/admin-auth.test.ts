import { describe, expect, it } from "vitest";
import { sessionToken, verifyToken } from "./admin-auth";

describe("admin-auth", () => {
	it("verifies a token built from the same password", () => {
		const token = sessionToken("hunter2");
		expect(verifyToken(token, "hunter2")).toBe(true);
	});

	it("rejects a token built from a different password", () => {
		const token = sessionToken("hunter2");
		expect(verifyToken(token, "wrong")).toBe(false);
	});

	it("rejects empty/garbage tokens", () => {
		expect(verifyToken("", "hunter2")).toBe(false);
		expect(verifyToken("garbage", "hunter2")).toBe(false);
	});
});
