import type { ReactNode } from "react";

export function Section({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
	return (
		<section id={id} className="mx-auto w-full max-w-3xl scroll-mt-20 px-6 py-12">
			{title ? <h2 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h2> : null}
			{children}
		</section>
	);
}
