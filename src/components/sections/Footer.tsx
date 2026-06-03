import { SocialLinks } from "@/components/ui/SocialLinks";
import type { SocialLink } from "@/types/portfolio";

export function Footer({ name, social }: { name: string; social: SocialLink[] }) {
	return (
		<footer className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-6 py-10 text-sm text-muted">
			<SocialLinks social={social} />
			<p>© {name}</p>
		</footer>
	);
}
