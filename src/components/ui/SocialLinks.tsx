import { FiGithub, FiGlobe, FiLinkedin, FiMail } from "react-icons/fi";
import type { SocialLink } from "@/types/portfolio";

const ICONS: Record<string, typeof FiGithub> = {
	github: FiGithub,
	linkedin: FiLinkedin,
	email: FiMail,
};

export function SocialLinks({ social }: { social: SocialLink[] }) {
	return (
		<div className="flex items-center gap-3">
			{social.map((s) => {
				const Icon = ICONS[s.icon] ?? FiGlobe;
				return (
					<a
						key={s.name}
						href={s.link}
						target={s.link.startsWith("http") ? "_blank" : undefined}
						rel="noreferrer"
						aria-label={s.name}
						className="rounded-full border border-border p-2 text-fg transition-colors hover:bg-card hover:text-accent"
					>
						<Icon size={18} />
					</a>
				);
			})}
		</div>
	);
}
