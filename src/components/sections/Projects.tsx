import { FiArrowUpRight } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Section } from "@/components/ui/Section";
import type { Project } from "@/types/portfolio";

export function Projects({ projects }: { projects: Project[] }) {
	return (
		<Section id="projects" title="Projects">
			<div className="grid gap-4 sm:grid-cols-2">
				{projects.map((project, i) => (
					<div key={`${project.title}-${i}`} className="flex flex-col rounded-xl border border-border bg-card p-5">
						<h3 className="font-medium">{project.title}</h3>
						<div className="mt-1 text-sm text-muted">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							{project.tags.map((t) => (
								<span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
									{t}
								</span>
							))}
						</div>
						<div className="mt-3 flex flex-wrap gap-3">
							{project.links.map((l) => (
								<a
									key={l.url}
									href={l.url}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
								>
									{l.label} <FiArrowUpRight size={14} />
								</a>
							))}
						</div>
					</div>
				))}
			</div>
		</Section>
	);
}
