import { Section } from "@/components/ui/Section";
import type { Education as EducationType } from "@/types/portfolio";

export function Education({ education }: { education: EducationType[] }) {
	return (
		<Section id="education" title="Education">
			<div className="flex flex-col gap-4">
				{education.map((e, i) => (
					<div key={`${e.name}-${i}`}>
						<h3 className="font-medium">{e.name}</h3>
						<p className="text-sm text-muted">{e.description}</p>
					</div>
				))}
			</div>
		</Section>
	);
}
