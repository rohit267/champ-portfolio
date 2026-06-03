"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [
	["about", "About"],
	["skills", "Skills"],
	["experience", "Experience"],
	["projects", "Projects"],
	["education", "Education"],
] as const;

export function Nav({ name }: { name: string }) {
	return (
		<header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
			<nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
				<a href="#top" className="font-semibold tracking-tight">
					{name}
				</a>
				<div className="flex items-center gap-4">
					<ul className="hidden gap-5 text-sm text-muted sm:flex">
						{LINKS.map(([id, label]) => (
							<li key={id}>
								<a href={`#${id}`} className="transition-colors hover:text-fg">
									{label}
								</a>
							</li>
						))}
					</ul>
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
