export type SocialLink = { name: string; icon: string; link: string };
export type SkillTag = { name: string; icon: string };
export type SkillGroup = { title: string; description: string; tags: SkillTag[] };
export type Experience = { company: string; role: string; timeframe: string; achievements: string[] };
export type ProjectLink = { label: string; url: string };
export type Project = { title: string; description: string; tags: string[]; links: ProjectLink[] };
export type Education = { name: string; description: string };

export type Person = {
	firstName: string;
	lastName: string;
	name: string;
	role: string;
	avatar: string;
	email: string;
	location: string;
	languages: string[];
};

export type PortfolioContent = {
	person: Person;
	social: SocialLink[];
	about: { intro: string };
	skills: SkillGroup[];
	experience: Experience[];
	projects: Project[];
	education: Education[];
};
