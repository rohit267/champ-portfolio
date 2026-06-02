export function ThemeScript() {
	const js = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
	// biome-ignore lint/security/noDangerouslySetInnerHtml: required for pre-hydration theme
	return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
