import { siteUrl } from "@/lib/site";
import type { PortfolioContent } from "@/types/portfolio";

/** Emits schema.org Person structured data so search engines understand the portfolio. */
export function JsonLd({ content }: { content: PortfolioContent }) {
	const { person, about, social, skills, experience } = content;

	const sameAs = social.map((s) => s.link).filter((link) => link.startsWith("http"));
	const knowsAbout = skills.flatMap((group) => group.tags.map((tag) => tag.name));
	const currentRole = experience[0];

	const data = {
		"@context": "https://schema.org",
		"@type": "Person",
		name: person.name,
		jobTitle: person.role,
		description: about.intro,
		url: siteUrl,
		image: `${siteUrl}${person.avatar}`,
		email: person.email,
		address: person.location ? { "@type": "PostalAddress", addressLocality: person.location } : undefined,
		sameAs,
		knowsAbout,
		knowsLanguage: person.languages,
		worksFor: currentRole ? { "@type": "Organization", name: currentRole.company } : undefined,
	};

	return (
		// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inlined as a script
		<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
	);
}
