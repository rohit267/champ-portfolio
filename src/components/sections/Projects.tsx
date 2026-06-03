import type { IconType } from "react-icons";
import { FiBook, FiExternalLink, FiGithub, FiPlay, FiSmartphone } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Section } from "@/components/ui/Section";
import type { Project, ProjectLink } from "@/types/portfolio";

function linkIcon(label: string): IconType {
	const l = label.toLowerCase();
	if (l.includes("github") || l.includes("source") || l.includes("code") || l.includes("repo")) return FiGithub;
	if (l.includes("play") || l.includes("android") || l.includes("app store") || l.includes("ios") || l.includes("apk"))
		return FiSmartphone;
	if (l.includes("video") || l.includes("youtube") || l.includes("demo video")) return FiPlay;
	if (l.includes("doc") || l.includes("blog") || l.includes("article") || l.includes("paper")) return FiBook;
	return FiExternalLink;
}

function ProjectLinks({ links }: { links: ProjectLink[] }) {
	return (
		<div className="mt-3 flex flex-wrap gap-2">
			{links.map((l) => {
				const Icon = linkIcon(l.label);
				return (
					<a
						key={`${l.label}-${l.url}`}
						href={l.url}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent transition-colors hover:border-accent/60"
					>
						<Icon size={13} />
						{l.label}
					</a>
				);
			})}
		</div>
	);
}

export function Projects({ projects }: { projects: Project[] }) {
	return (
		<Section id="projects" title="Projects" tinted>
			<div className="grid gap-4 sm:grid-cols-2">
				{projects.map((project, i) => (
					<div
						key={`${project.title}-${i}`}
						className="flex flex-col rounded-xl border border-border bg-bg p-5 transition-colors hover:border-accent/40"
					>
						<h3 className="font-medium">{project.title}</h3>
						<div className="mt-1 text-sm text-muted">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown>
						</div>
						{project.tags.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-2">
								{project.tags.map((t) => (
									<span
										key={t}
										className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
									>
										{t}
									</span>
								))}
							</div>
						)}
						{project.links.length > 0 && <ProjectLinks links={project.links} />}
					</div>
				))}
			</div>
		</Section>
	);
}
