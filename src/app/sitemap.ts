const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "https://rohit-portfolio.example.com";

export default function sitemap() {
	return [
		{
			url: baseURL,
			lastModified: new Date().toISOString().split("T")[0],
		},
	];
}
