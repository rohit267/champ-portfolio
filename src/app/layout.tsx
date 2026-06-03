import type { Metadata } from "next";
import { PortfolioChat } from "@/components/PortfolioChat";
import { ThemeScript } from "@/components/ui/ThemeScript";
import { getContent } from "@/lib/content";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
	const { person, about, skills } = await getContent();
	const title = `${person.name} — ${person.role}`;
	const description = about.intro;
	const keywords = [person.role, ...skills.flatMap((group) => group.tags.map((tag) => tag.name))];

	return {
		metadataBase: new URL(siteUrl),
		title: {
			default: title,
			template: `%s — ${person.name}`,
		},
		description,
		keywords,
		authors: [{ name: person.name }],
		creator: person.name,
		applicationName: `${person.name} Portfolio`,
		alternates: { canonical: "/" },
		robots: {
			index: true,
			follow: true,
			googleBot: { index: true, follow: true, "max-image-preview": "large" },
		},
		openGraph: {
			type: "profile",
			url: siteUrl,
			siteName: `${person.name} Portfolio`,
			title,
			description,
			images: [{ url: person.avatar, width: 400, height: 400, alt: person.name }],
			locale: "en_US",
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [person.avatar],
		},
		icons: { icon: "/favicon.png" },
	};
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<ThemeScript />
			</head>
			<body className="min-h-screen antialiased">
				{children}
				<PortfolioChat />
			</body>
		</html>
	);
}
