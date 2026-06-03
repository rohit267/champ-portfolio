import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Section } from "@/components/ui/Section";

export function About({ intro }: { intro: string }) {
	return (
		<Section id="about" title="About">
			<div className="leading-relaxed text-muted">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
			</div>
		</Section>
	);
}
