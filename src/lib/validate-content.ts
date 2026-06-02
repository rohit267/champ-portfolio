import type { PortfolioContent } from "@/types/portfolio";

type Result = { ok: boolean; errors: string[] };

function isStr(v: unknown): v is string {
	return typeof v === "string";
}
function isStrArray(v: unknown): v is string[] {
	return Array.isArray(v) && v.every(isStr);
}

export function validateContent(data: unknown): Result {
	const errors: string[] = [];
	const d = data as Record<string, any>;

	if (!d || typeof d !== "object" || Array.isArray(d)) {
		return { ok: false, errors: ["content must be an object"] };
	}

	const p = d.person;
	if (!p || typeof p !== "object") {
		errors.push("person is required");
	} else {
		for (const k of ["firstName", "lastName", "name", "role", "avatar", "email", "location"]) {
			if (!isStr(p[k])) errors.push(`person.${k} must be a string`);
		}
		if (!isStrArray(p.languages)) errors.push("person.languages must be a string[]");
	}

	if (!isStr(d.about?.intro)) errors.push("about.intro must be a string");

	const arrays: Array<[string, (item: any) => string[]]> = [
		[
			"social",
			(s) => (isStr(s?.name) && isStr(s?.icon) && isStr(s?.link) ? [] : ["social entry needs name, icon, link"]),
		],
		[
			"skills",
			(s) =>
				isStr(s?.title) &&
				isStr(s?.description) &&
				Array.isArray(s?.tags) &&
				s.tags.every((t: any) => isStr(t?.name) && isStr(t?.icon))
					? []
					: ["skills entry needs title, description, tags[{name,icon}]"],
		],
		[
			"experience",
			(e) =>
				isStr(e?.company) && isStr(e?.role) && isStr(e?.timeframe) && isStrArray(e?.achievements)
					? []
					: ["experience entry needs company, role, timeframe, achievements[]"],
		],
		[
			"projects",
			(p2) =>
				isStr(p2?.title) &&
				isStr(p2?.description) &&
				isStrArray(p2?.tags) &&
				Array.isArray(p2?.links) &&
				p2.links.every((l: any) => isStr(l?.label) && isStr(l?.url))
					? []
					: ["projects entry needs title, description, tags[], links[{label,url}]"],
		],
		[
			"education",
			(e) => (isStr(e?.name) && isStr(e?.description) ? [] : ["education entry needs name, description"]),
		],
	];

	for (const [key, check] of arrays) {
		if (!Array.isArray(d[key])) {
			errors.push(`${key} must be an array`);
			continue;
		}
		d[key].forEach((item: any, i: number) => {
			for (const msg of check(item)) errors.push(`${key}[${i}]: ${msg}`);
		});
	}

	return { ok: errors.length === 0, errors };
}

export function assertContent(data: unknown): asserts data is PortfolioContent {
	const { ok, errors } = validateContent(data);
	if (!ok) throw new Error(`Invalid content: ${errors.join("; ")}`);
}
