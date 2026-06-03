"use client";

import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

export function ThemeToggle() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		setDark(document.documentElement.classList.contains("dark"));
	}, []);

	function toggle() {
		const next = !dark;
		setDark(next);
		document.documentElement.classList.toggle("dark", next);
		localStorage.setItem("theme", next ? "dark" : "light");
	}

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label="Toggle theme"
			className="rounded-full border border-border p-2 text-fg transition-colors hover:bg-card"
		>
			{dark ? <FiSun size={18} /> : <FiMoon size={18} />}
		</button>
	);
}
