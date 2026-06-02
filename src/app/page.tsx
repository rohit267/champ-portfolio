import { About } from "@/components/sections/About";
import { Education } from "@/components/sections/Education";
import { Experience } from "@/components/sections/Experience";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Nav } from "@/components/sections/Nav";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { getContent } from "@/lib/content";

export default async function Home() {
	const content = await getContent();
	return (
		<>
			<Nav name={content.person.name} />
			<main>
				<Hero person={content.person} social={content.social} />
				<About intro={content.about.intro} />
				<Skills skills={content.skills} />
				<Experience experience={content.experience} />
				<Projects projects={content.projects} />
				<Education education={content.education} />
			</main>
			<Footer name={content.person.name} social={content.social} />
		</>
	);
}
