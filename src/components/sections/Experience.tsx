import { Section } from "@/components/ui/Section";
import type { Experience as ExperienceType } from "@/types/portfolio";

export function Experience({ experience }: { experience: ExperienceType[] }) {
	return (
		<Section id="experience" title="Experience">
			<div className="flex flex-col gap-8 border-l border-border pl-6">
				{experience.map((exp, i) => (
					<div key={`${exp.company}-${i}`} className="relative">
						<span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<h3 className="font-medium">
								{exp.role} · {exp.company}
							</h3>
							<span className="text-xs text-muted">{exp.timeframe}</span>
						</div>
						<ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
							{exp.achievements.map((a, j) => (
								<li key={j}>{a}</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</Section>
	);
}
