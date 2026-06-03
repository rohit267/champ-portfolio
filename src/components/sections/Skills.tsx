import { Section } from "@/components/ui/Section";
import type { SkillGroup } from "@/types/portfolio";

export function Skills({ skills }: { skills: SkillGroup[] }) {
	return (
		<Section id="skills" title="Skills" tinted>
			<div className="flex flex-col gap-6">
				{skills.map((group) => (
					<div key={group.title}>
						<h3 className="mb-1 font-medium">{group.title}</h3>
						<p className="mb-3 text-sm text-muted">{group.description}</p>
						<div className="flex flex-wrap gap-2">
							{group.tags.map((tag) => (
								<span
									key={tag.name}
									className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
								>
									{tag.name}
								</span>
							))}
						</div>
					</div>
				))}
			</div>
		</Section>
	);
}
