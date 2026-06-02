import Image from "next/image";
import { FiDownload, FiMapPin } from "react-icons/fi";
import { SocialLinks } from "@/components/ui/SocialLinks";
import type { PortfolioContent } from "@/types/portfolio";

export function Hero({ person, social }: Pick<PortfolioContent, "person" | "social">) {
	return (
		<section id="top" className="mx-auto w-full max-w-3xl px-6 pt-16 pb-8">
			<div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
				<Image
					src={person.avatar}
					alt={person.name}
					width={96}
					height={96}
					className="rounded-full border border-border object-cover"
				/>
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold tracking-tight text-accent">{person.name}</h1>
					<p className="text-muted">{person.role}</p>
					{person.location ? (
						<p className="flex items-center gap-1.5 text-sm text-muted">
							<FiMapPin size={14} className="text-accent" />
							{person.location}
						</p>
					) : null}
					<div className="mt-2 flex flex-wrap items-center gap-3">
						<SocialLinks social={social} />
						<a
							href="/resume.pdf"
							className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
						>
							<FiDownload size={16} /> Download Resume
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
