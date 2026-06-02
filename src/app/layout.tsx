import type { Metadata } from "next";
import { PortfolioChat } from "@/components/PortfolioChat";
import { ThemeScript } from "@/components/ui/ThemeScript";
import { getContent } from "@/lib/content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
	const { person } = await getContent();
	return {
		title: `${person.name} — ${person.role}`,
		description: `Portfolio of ${person.name}, ${person.role}.`,
	};
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="icon" type="image/png" href="/favicon.png" />
				<ThemeScript />
			</head>
			<body className="min-h-screen antialiased">
				{children}
				<PortfolioChat />
			</body>
		</html>
	);
}
