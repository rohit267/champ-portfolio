import type { ReactNode } from "react";

export function Section({
	id,
	title,
	tinted,
	children,
}: {
	id: string;
	title?: string;
	tinted?: boolean;
	children: ReactNode;
}) {
	return (
		<section id={id} className="scroll-mt-20 px-6 py-6">
			<div
				className={
					tinted
						? "mx-auto w-full max-w-3xl rounded-3xl border border-accent/15 bg-accent-soft/60 px-6 py-10 sm:px-8"
						: "mx-auto w-full max-w-3xl py-6"
				}
			>
				{title ? <h2 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h2> : null}
				{children}
			</div>
		</section>
	);
}
