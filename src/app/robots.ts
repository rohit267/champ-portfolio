const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "https://rohit-portfolio.example.com";

export default function robots() {
	return {
		rules: [
			{
				userAgent: "*",
			},
		],
		sitemap: `${baseURL}/sitemap.xml`,
	};
}
