import { siteUrl } from "@/lib/site";

export default function sitemap() {
	return [
		{
			url: siteUrl,
			lastModified: new Date().toISOString().split("T")[0],
		},
	];
}
