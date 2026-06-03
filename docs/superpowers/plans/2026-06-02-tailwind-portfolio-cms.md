# Tailwind Portfolio + Mini-CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Once UI template with a clean single-page Tailwind portfolio, preserve the LangChain RAG chat, and add a password-protected `/admin` mini-CMS that edits a JSON file backing both the site and the chat.

**Architecture:** Content lives in `src/data/content.json`, read/written only through `src/lib/content.ts`. The public page and `portfolio-rag.ts` both consume `getContent()`. Saving from `/admin` validates, writes atomically, and resets the RAG vector cache so the chat stays in sync. Auth is a stateless HMAC cookie keyed off `ADMIN_PASSWORD`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, LangChain (Ollama), react-markdown, Vitest (lib tests only), Node crypto.

**Testing note:** This project has no existing test framework and is UI-heavy. We add Vitest **only** for the content/validation/auth logic modules (genuinely worth testing). UI tasks verify via `npx tsc --noEmit`, `npm run build`, and manual `npm run dev` checks — not unit tests.

**Spec:** `docs/superpowers/specs/2026-06-02-tailwind-portfolio-cms-design.md`

---

## File Structure

**Create:**
- `src/data/content.json` — all portfolio content (single source of truth)
- `src/types/portfolio.ts` — `PortfolioContent` type + sub-types
- `src/lib/content.ts` — `getContent()` / `saveContent()` + atomic write
- `src/lib/validate-content.ts` — `validateContent()` shape validator
- `src/lib/admin-auth.ts` — HMAC session token helpers
- `src/lib/content.test.ts`, `src/lib/validate-content.test.ts`, `src/lib/admin-auth.test.ts`
- `src/app/globals.css` — Tailwind v4 entry + theme tokens
- `postcss.config.mjs`
- `src/components/ui/Section.tsx`, `SocialLinks.tsx`, `ThemeScript.tsx`, `ThemeToggle.tsx`
- `src/components/sections/Hero.tsx`, `About.tsx`, `Skills.tsx`, `Experience.tsx`, `Projects.tsx`, `Education.tsx`, `Nav.tsx`, `Footer.tsx`
- `src/app/admin/page.tsx`, `src/app/admin/AdminForm.tsx`, `src/app/admin/login/page.tsx`
- `src/app/api/admin/content/route.ts`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/logout/route.ts`

**Modify:**
- `src/lib/portfolio-rag.ts` — consume `getContent()`, export `resetVectorStore()`
- `src/app/layout.tsx` — Tailwind globals, theme script, mount chat
- `src/app/page.tsx` — compose sections from `getContent()`
- `src/components/PortfolioChat.tsx` — SCSS → Tailwind (logic unchanged)
- `src/resources/index.ts`, `src/types/index.ts`, `src/components/index.ts` — prune barrels
- `package.json` — deps in/out, scripts
- `.env.example` — add `ADMIN_PASSWORD`

**Delete:** `@once-ui-system`-coupled files (Header, Footer, ProjectCard, Providers, RouteGuard, ScrollToHash, HeadingLink, mdx.tsx, ThemeToggle.module.scss, about/, work/, blog/ component dirs, breakpoints.scss, *.module.scss), `src/resources/once-ui.config.ts`, `src/resources/custom.css`, `src/resources/content.tsx`, `src/app/work/`, `src/app/api/og/`, `src/app/api/authenticate/`, `src/app/api/check-auth/`, `src/app/not-found.tsx` (replace), `public/soul.md`.

---

## Phase 0 — Tooling

### Task 0: Install Tailwind v4 + Vitest, remove Once UI dep

**Files:**
- Modify: `package.json`
- Create: `postcss.config.mjs`, `src/app/globals.css`

- [ ] **Step 1: Install/remove deps**

```bash
npm install -D tailwindcss@^4 @tailwindcss/postcss postcss vitest
npm uninstall @once-ui-system/core @next/mdx @mdx-js/loader next-mdx-remote gray-matter sass transliteration classnames
```

- [ ] **Step 2: Create `postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

- [ ] **Step 3: Create `src/app/globals.css`** (Tailwind v4 CSS-first config, class-based dark mode + tokens)

```css
@import "tailwindcss";

/* Enable class-based dark mode (toggle adds/removes .dark on <html>) */
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --bg: #ffffff;
  --fg: #0a0a0a;
  --muted: #6b7280;
  --card: #f7f7f8;
  --border: #e5e7eb;
  --accent: #2563eb;
}

.dark {
  --bg: #0a0a0b;
  --fg: #f5f5f5;
  --muted: #9ca3af;
  --card: #141417;
  --border: #26262b;
  --accent: #60a5fa;
}

@theme inline {
  --color-bg: var(--bg);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-card: var(--card);
  --color-border: var(--border);
  --color-accent: var(--accent);
}

html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--fg); }
```

- [ ] **Step 4: Add `test` script to `package.json`**

In the `"scripts"` block add: `"test": "vitest run"`.

- [ ] **Step 5: Verify install**

Run: `npm run test -- --version` then `npx tsc --noEmit`
Expected: vitest prints a version; tsc may still error on not-yet-deleted Once UI files — that's fine for now.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json postcss.config.mjs src/app/globals.css
git commit -m "chore: add Tailwind v4 + Vitest, drop Once UI deps"
```

---

## Phase 1 — Content model

### Task 1: Define `PortfolioContent` types

**Files:**
- Create: `src/types/portfolio.ts`

- [ ] **Step 1: Write `src/types/portfolio.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit src/types/portfolio.ts`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/types/portfolio.ts
git commit -m "feat: add PortfolioContent types"
```

### Task 2: Seed `content.json` from existing data

**Files:**
- Create: `src/data/content.json`

- [ ] **Step 1: Write `src/data/content.json`** porting the real values from the old `content.tsx` (JSX descriptions flattened to markdown strings). Use this exact content:

```json
{
  "person": {
    "firstName": "Rohit",
    "lastName": "Mahto",
    "name": "Rohit Mahto",
    "role": "Sr. Full Stack AI Engineer",
    "avatar": "/images/avatar.jpg",
    "email": "rohit@champdev.me",
    "location": "Asia/Kolkata",
    "languages": ["English", "Hindi"]
  },
  "social": [
    { "name": "GitHub", "icon": "github", "link": "https://github.com/rohit267" },
    { "name": "LinkedIn", "icon": "linkedin", "link": "https://www.linkedin.com/in/rohit-mahto-489526149/" },
    { "name": "Email", "icon": "email", "link": "mailto:rohit@champdev.me" }
  ],
  "about": {
    "intro": "Rohit is a Sr. Full Stack AI Engineer with expertise in building production web applications, generative AI experiences, agentic workflows, RAG chatbots, and API-driven platforms. He combines Next.js, Angular, Node.js, GraphQL, MongoDB, and payment integrations with modern AI tooling such as LangChain, OpenAI-compatible APIs, and Ollama."
  },
  "skills": [
    {
      "title": "Generative & Agentic AI",
      "description": "Build AI-powered product experiences, RAG pipelines, chatbot backends, and agentic workflows with production-oriented API integration.",
      "tags": [
        { "name": "Generative AI", "icon": "openai" },
        { "name": "Agentic AI", "icon": "langchain" },
        { "name": "RAG", "icon": "langchain" },
        { "name": "LangChain", "icon": "langchain" },
        { "name": "OpenAI APIs", "icon": "openai" },
        { "name": "Ollama", "icon": "ollama" },
        { "name": "Hugging Face", "icon": "huggingface" },
        { "name": "Vector Search", "icon": "database" },
        { "name": "Prompt Engineering", "icon": "rocket" }
      ]
    },
    {
      "title": "Full Stack Engineering",
      "description": "Build scalable web applications, APIs, dashboards, and integrations with modern TypeScript-first engineering practices.",
      "tags": [
        { "name": "Next.js", "icon": "nextjs" },
        { "name": "React.js", "icon": "react" },
        { "name": "Node.js", "icon": "nodejs" },
        { "name": "TypeScript", "icon": "typescript" },
        { "name": "JavaScript", "icon": "javascript" },
        { "name": "GraphQL", "icon": "graphql" },
        { "name": "MongoDB", "icon": "mongodb" },
        { "name": "MySQL", "icon": "mysql" },
        { "name": "Redis", "icon": "redis" },
        { "name": "Socket.io", "icon": "socketdotio" },
        { "name": "PHP", "icon": "php" }
      ]
    },
    {
      "title": "Mobile Development",
      "description": "Experience building cross-platform and native mobile applications that connect to production backend systems.",
      "tags": [
        { "name": "Android Studio", "icon": "android" },
        { "name": "Java", "icon": "java" },
        { "name": "React Native", "icon": "react" }
      ]
    },
    {
      "title": "DevOps & Delivery",
      "description": "Ship and operate applications with practical CI/CD, container, and server deployment experience.",
      "tags": [
        { "name": "Git", "icon": "git" },
        { "name": "GitHub", "icon": "github" },
        { "name": "Bitbucket", "icon": "bitbucket" },
        { "name": "Docker", "icon": "docker" },
        { "name": "Jenkins", "icon": "jenkins" },
        { "name": "Nginx", "icon": "nginx" }
      ]
    }
  ],
  "experience": [
    {
      "company": "Techolution",
      "role": "Sr. Full Stack AI Engineer",
      "timeframe": "Mar 2022 - Present",
      "achievements": [
        "Develop and maintain full-stack internal tools using Angular, Node.js, GraphQL, and MongoDB.",
        "Build AI-enabled workflows, RAG-backed assistants, and OpenAI-compatible API integrations for product experiences.",
        "Write clean, well-documented code following best practices.",
        "Collaborate with US clients in daily standup meetings to align on project goals."
      ]
    },
    {
      "company": "TechChefz",
      "role": "Full Stack Developer",
      "timeframe": "Apr 2021 - Feb 2022",
      "achievements": [
        "Built and maintained client requirements using Next.js and Node.js.",
        "Improved page performance by 20% through optimization techniques.",
        "Integrated payment gateways including Razorpay, Paytm, and UPI with DBS Bank."
      ]
    },
    {
      "company": "Team UDAAN",
      "role": "Technical Head",
      "timeframe": "Jan 2020 - Mar 2021",
      "achievements": [
        "Redesigned and developed a new student portal using React.js.",
        "Built backend systems for REC Student Portal Android app and website using PHP and MySQL.",
        "Designed and developed front-end and backend for college events like Quizathon and Gusto.",
        "Mentored a team of 30+ students."
      ]
    },
    {
      "company": "TechChefz",
      "role": "Front-end Developer Intern",
      "timeframe": "Oct 2020 - Dec 2020",
      "achievements": [
        "Built and maintained client requirements using Next.js.",
        "Implemented Paytm payment gateway integration."
      ]
    },
    {
      "company": "Bins Computer",
      "role": "Web Developer Intern",
      "timeframe": "Jun 2020 - Jul 2020",
      "achievements": [
        "Developed front-end for Sarvekshan using HTML, CSS, and jQuery.",
        "Built backend for Sarvekshan using PHP and MySQL."
      ]
    }
  ],
  "projects": [
    {
      "title": "Placeholder Project One",
      "description": "Replace this with a real project. Describe the problem, your role, and the impact. Markdown is supported.",
      "tags": ["Next.js", "LangChain", "RAG"],
      "links": [{ "label": "GitHub", "url": "https://github.com/rohit267" }]
    },
    {
      "title": "Placeholder Project Two",
      "description": "Replace this with a real project. Describe the problem, your role, and the impact. Markdown is supported.",
      "tags": ["Node.js", "GraphQL", "MongoDB"],
      "links": [{ "label": "GitHub", "url": "https://github.com/rohit267" }]
    }
  ],
  "education": [
    { "name": "Ramgarh Engineering College, Ramgarh", "description": "B.Tech in Computer Science & Engineering, CGPA: 7.96." },
    { "name": "DAV Public School, Koyla Nagar", "description": "CBSE Intermediate (Science), Score: 70.67%." },
    { "name": "DAV Public School, Barora", "description": "CBSE Matriculation, CGPA: 8.4." }
  ]
}
```

> Note: company name corrected to "Techolution" (was misspelled "Techcholution").

- [ ] **Step 2: Verify valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/data/content.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/data/content.json
git commit -m "feat: seed content.json from existing portfolio data"
```

### Task 3: Validator `validate-content.ts` (TDD)

**Files:**
- Create: `src/lib/validate-content.ts`, `src/lib/validate-content.test.ts`

- [ ] **Step 1: Write failing test `src/lib/validate-content.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { validateContent } from "./validate-content";
import valid from "../data/content.json";

describe("validateContent", () => {
  it("accepts the seed content", () => {
    expect(validateContent(valid)).toEqual({ ok: true, errors: [] });
  });

  it("rejects a non-object", () => {
    expect(validateContent(null).ok).toBe(false);
  });

  it("rejects missing person.name", () => {
    const bad = structuredClone(valid) as any;
    delete bad.person.name;
    const res = validateContent(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toContain("person.name");
  });

  it("rejects when experience is not an array", () => {
    const bad = structuredClone(valid) as any;
    bad.experience = "nope";
    expect(validateContent(bad).ok).toBe(false);
  });

  it("rejects an experience entry missing achievements array", () => {
    const bad = structuredClone(valid) as any;
    bad.experience[0].achievements = "x";
    expect(validateContent(bad).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/lib/validate-content.test.ts`
Expected: FAIL — cannot find module `./validate-content`.

- [ ] **Step 3: Implement `src/lib/validate-content.ts`**

```ts
import type { PortfolioContent } from "@/types/portfolio";

type Result = { ok: boolean; errors: string[] };

function isStr(v: unknown): v is string {
  return typeof v === "string";
}
function isStrArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isStr);
}

export function validateContent(data: unknown): Result {
  const errors: string[] = [];
  const d = data as Record<string, any>;

  if (!d || typeof d !== "object" || Array.isArray(d)) {
    return { ok: false, errors: ["content must be an object"] };
  }

  const p = d.person;
  if (!p || typeof p !== "object") {
    errors.push("person is required");
  } else {
    for (const k of ["firstName", "lastName", "name", "role", "avatar", "email", "location"]) {
      if (!isStr(p[k])) errors.push(`person.${k} must be a string`);
    }
    if (!isStrArray(p.languages)) errors.push("person.languages must be a string[]");
  }

  if (!isStr(d.about?.intro)) errors.push("about.intro must be a string");

  const arrays: Array<[string, (item: any) => string[]]> = [
    ["social", (s) => (isStr(s?.name) && isStr(s?.icon) && isStr(s?.link) ? [] : ["social entry needs name, icon, link"])],
    ["skills", (s) =>
      (isStr(s?.title) && isStr(s?.description) && Array.isArray(s?.tags) &&
        s.tags.every((t: any) => isStr(t?.name) && isStr(t?.icon)))
        ? []
        : ["skills entry needs title, description, tags[{name,icon}]"]],
    ["experience", (e) =>
      (isStr(e?.company) && isStr(e?.role) && isStr(e?.timeframe) && isStrArray(e?.achievements))
        ? []
        : ["experience entry needs company, role, timeframe, achievements[]"]],
    ["projects", (p2) =>
      (isStr(p2?.title) && isStr(p2?.description) && isStrArray(p2?.tags) &&
        Array.isArray(p2?.links) && p2.links.every((l: any) => isStr(l?.label) && isStr(l?.url)))
        ? []
        : ["projects entry needs title, description, tags[], links[{label,url}]"]],
    ["education", (e) => (isStr(e?.name) && isStr(e?.description) ? [] : ["education entry needs name, description"])],
  ];

  for (const [key, check] of arrays) {
    if (!Array.isArray(d[key])) {
      errors.push(`${key} must be an array`);
      continue;
    }
    d[key].forEach((item: any, i: number) => {
      for (const msg of check(item)) errors.push(`${key}[${i}]: ${msg}`);
    });
  }

  return { ok: errors.length === 0, errors };
}

export function assertContent(data: unknown): asserts data is PortfolioContent {
  const { ok, errors } = validateContent(data);
  if (!ok) throw new Error(`Invalid content: ${errors.join("; ")}`);
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/validate-content.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validate-content.ts src/lib/validate-content.test.ts
git commit -m "feat: add content validator with tests"
```

### Task 4: `content.ts` read/write (TDD)

**Files:**
- Create: `src/lib/content.ts`, `src/lib/content.test.ts`

- [ ] **Step 1: Write failing test `src/lib/content.test.ts`**

```ts
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { _setContentPathForTests, getContent, saveContent } from "./content";
import seed from "../data/content.json";

let tmp: string | undefined;

afterEach(() => {
  if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp);
  tmp = undefined;
});

function freshFile() {
  tmp = path.join(os.tmpdir(), `content-${process.hrtime.bigint()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(seed));
  _setContentPathForTests(tmp);
  return tmp;
}

describe("content.ts", () => {
  it("reads content from disk", async () => {
    freshFile();
    const c = await getContent();
    expect(c.person.name).toBe("Rohit Mahto");
  });

  it("round-trips a save", async () => {
    freshFile();
    const c = await getContent();
    c.person.role = "Updated Role";
    await saveContent(c);
    const again = await getContent();
    expect(again.person.role).toBe("Updated Role");
  });

  it("rejects invalid content without writing", async () => {
    const file = freshFile();
    const before = fs.readFileSync(file, "utf8");
    await expect(saveContent({ person: {} } as any)).rejects.toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/lib/content.test.ts`
Expected: FAIL — cannot find module `./content`.

- [ ] **Step 3: Implement `src/lib/content.ts`**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import type { PortfolioContent } from "@/types/portfolio";
import { assertContent } from "./validate-content";

let contentPath = path.join(process.cwd(), "src", "data", "content.json");

/** Test-only hook to point at a temp file. */
export function _setContentPathForTests(p: string) {
  contentPath = p;
}

export async function getContent(): Promise<PortfolioContent> {
  const raw = await fs.readFile(contentPath, "utf8");
  const data = JSON.parse(raw);
  assertContent(data);
  return data;
}

export async function saveContent(data: unknown): Promise<PortfolioContent> {
  assertContent(data);
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  const tmp = `${contentPath}.tmp`;
  await fs.writeFile(tmp, serialized, "utf8");
  await fs.rename(tmp, contentPath);
  return data;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/content.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/content.ts src/lib/content.test.ts
git commit -m "feat: add content read/write module with atomic save"
```

---

## Phase 2 — Rewire RAG

### Task 5: Point `portfolio-rag.ts` at `getContent()` + add cache reset

**Files:**
- Modify: `src/lib/portfolio-rag.ts`

- [ ] **Step 1: Replace the resources import.** Change the top-of-file import
  `import { about, person, social } from "@/resources";`
  to:

```ts
import { getContent } from "@/lib/content";
```

Remove the now-unused imports `matter` (gray-matter), `fs`, `path` **only if** they are not used elsewhere — `loadProjectDocuments` is being deleted, so they likely become unused. Keep `fs`/`path` import lines only if other code references them (search first: `grep -n "fs\.\|path\." src/lib/portfolio-rag.ts`).

- [ ] **Step 2: Delete `loadProjectDocuments`** entirely (the whole function from `async function loadProjectDocuments` through its closing brace).

- [ ] **Step 3: Rewrite `buildPortfolioDocuments`** to read from content and include projects. Replace the whole function body with:

```ts
async function buildPortfolioDocuments(requestId: string): Promise<Document[]> {
  const startedAt = performance.now();
  const content = await getContent();
  const { person, social, about, experience, skills, projects, education } = content;

  const documents: Document[] = [
    new Document({
      pageContent: cleanText(
        [
          `Name: ${person.name}`,
          `Role: ${person.role}`,
          `Email: ${person.email}`,
          `Location/time zone: ${person.location}`,
          `Languages: ${person.languages?.join(", ") || "Not listed"}`,
          `Introduction: ${about.intro}`,
        ].join("\n"),
      ),
      metadata: { source: "Profile" },
    }),
    new Document({
      pageContent: cleanText(social.map((item) => `${item.name}: ${item.link}`).join("\n")),
      metadata: { source: "Social links" },
    }),
    ...experience.map(
      (exp) =>
        new Document({
          pageContent: cleanText(
            [
              `Company: ${exp.company}`,
              `Role: ${exp.role}`,
              `Timeframe: ${exp.timeframe}`,
              `Achievements: ${exp.achievements.join(" ")}`,
            ].join("\n"),
          ),
          metadata: { source: `Work: ${exp.company}` },
        }),
    ),
    ...skills.map(
      (skill) =>
        new Document({
          pageContent: cleanText(
            [
              `Skill area: ${skill.title}`,
              `Description: ${skill.description}`,
              `Technologies: ${skill.tags.map((tag) => tag.name).join(", ")}`,
            ].join("\n"),
          ),
          metadata: { source: `Skills: ${skill.title}` },
        }),
    ),
    ...projects.map(
      (project) =>
        new Document({
          pageContent: cleanText(
            [
              `Project: ${project.title}`,
              `Description: ${project.description}`,
              `Technologies: ${project.tags.join(", ")}`,
              `Links: ${project.links.map((l) => `${l.label} (${l.url})`).join(", ")}`,
            ].join("\n"),
          ),
          metadata: { source: `Project: ${project.title}` },
        }),
    ),
    ...education.map(
      (institution) =>
        new Document({
          pageContent: cleanText(
            [`Institution: ${institution.name}`, `Details: ${institution.description}`].join("\n"),
          ),
          metadata: { source: `Education: ${institution.name}` },
        }),
    ),
  ];

  logRag(requestId, "built portfolio document corpus", {
    totalDocuments: documents.length,
    elapsed: elapsed(startedAt),
  });

  return documents;
}
```

- [ ] **Step 4: Update the system prompt's `person.name` references.** The chat-model call uses `person.name` (around line 397) and `person.name` in sources. Since `person` is no longer a module import, fetch it inside the answering functions. In both `answerPortfolioQuestion` and `streamPortfolioQuestion`, after building/getting documents, add near the top: `const { person } = await getContent();` and use that. (Search for every `person.` / `about.` / `social.` reference in the file and ensure each is sourced from a local `getContent()` call, not the deleted import.)

- [ ] **Step 5: Add cache reset export.** Find the module-level `let vectorStorePromise: Promise<MemoryVectorStore> | undefined;` and add below it:

```ts
export function resetVectorStore() {
  vectorStorePromise = undefined;
}
```

- [ ] **Step 6: Verify it compiles and any stray `textFromNode` JSX helper is removed if now unused**

Run: `grep -n "textFromNode\|about\.\|matter(" src/lib/portfolio-rag.ts`
Expected: no remaining references to `matter(`, `about.` (old shape), or `textFromNode` on JSX. Remove `textFromNode` definition if unused.
Run: `npx tsc --noEmit` — expect no errors originating in `portfolio-rag.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/portfolio-rag.ts
git commit -m "refactor: drive RAG corpus from content.json, add resetVectorStore"
```

---

## Phase 3 — Public UI

### Task 6: Theme primitives (`ThemeScript`, `ThemeToggle`)

**Files:**
- Create: `src/components/ui/ThemeScript.tsx`, `src/components/ui/ThemeToggle.tsx`
- Delete: `src/components/ThemeToggle.tsx`, `src/components/ThemeToggle.module.scss`

- [ ] **Step 1: Create `src/components/ui/ThemeScript.tsx`** (blocking, anti-FOUC; rendered in `<head>`)

```tsx
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: required for pre-hydration theme
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
```

- [ ] **Step 2: Create `src/components/ui/ThemeToggle.tsx`**

```tsx
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
      className="rounded-full border border-border p-2 text-fg hover:bg-card transition-colors"
    >
      {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
    </button>
  );
}
```

- [ ] **Step 3: Delete old theme files**

```bash
git rm src/components/ThemeToggle.tsx src/components/ThemeToggle.module.scss
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit src/components/ui/ThemeToggle.tsx src/components/ui/ThemeScript.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ThemeScript.tsx src/components/ui/ThemeToggle.tsx
git commit -m "feat: add Tailwind theme script + toggle"
```

### Task 7: Shared UI (`Section`, `SocialLinks`)

**Files:**
- Create: `src/components/ui/Section.tsx`, `src/components/ui/SocialLinks.tsx`

- [ ] **Step 1: Create `src/components/ui/Section.tsx`**

```tsx
import type { ReactNode } from "react";

export function Section({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-3xl scroll-mt-20 px-6 py-12">
      {title ? <h2 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h2> : null}
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/SocialLinks.tsx`** (maps content icons → react-icons)

```tsx
import { FiGithub, FiLinkedin, FiMail, FiGlobe } from "react-icons/fi";
import type { SocialLink } from "@/types/portfolio";

const ICONS: Record<string, typeof FiGithub> = {
  github: FiGithub,
  linkedin: FiLinkedin,
  email: FiMail,
};

export function SocialLinks({ social }: { social: SocialLink[] }) {
  return (
    <div className="flex items-center gap-3">
      {social.map((s) => {
        const Icon = ICONS[s.icon] ?? FiGlobe;
        return (
          <a
            key={s.name}
            href={s.link}
            target={s.link.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            aria-label={s.name}
            className="rounded-full border border-border p-2 text-fg hover:bg-card hover:text-accent transition-colors"
          >
            <Icon size={18} />
          </a>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit src/components/ui/Section.tsx src/components/ui/SocialLinks.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Section.tsx src/components/ui/SocialLinks.tsx
git commit -m "feat: add Section + SocialLinks UI primitives"
```

### Task 8: Section components (Hero, About, Skills, Experience, Projects, Education, Nav, Footer)

**Files:**
- Create: `src/components/sections/{Hero,About,Skills,Experience,Projects,Education,Nav,Footer}.tsx`

- [ ] **Step 1: Create `src/components/sections/Nav.tsx`**

```tsx
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
        <a href="#top" className="font-semibold tracking-tight">{name}</a>
        <div className="flex items-center gap-4">
          <ul className="hidden gap-5 text-sm text-muted sm:flex">
            {LINKS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-fg transition-colors">{label}</a>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create `src/components/sections/Hero.tsx`**

```tsx
import Image from "next/image";
import { FiDownload } from "react-icons/fi";
import { SocialLinks } from "@/components/ui/SocialLinks";
import type { PortfolioContent } from "@/types/portfolio";

export function Hero({ person, social }: Pick<PortfolioContent, "person" | "social">) {
  return (
    <section id="top" className="mx-auto w-full max-w-3xl px-6 pt-16 pb-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Image
          src={person.avatar}
          alt={person.name}
          width={96}
          height={96}
          className="rounded-full border border-border object-cover"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{person.name}</h1>
          <p className="text-muted">{person.role}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <SocialLinks social={social} />
            <a
              href="/resume.pdf"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              <FiDownload size={16} /> Download Resume
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/sections/About.tsx`**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Section } from "@/components/ui/Section";

export function About({ intro }: { intro: string }) {
  return (
    <Section id="about" title="About">
      <div className="prose-portfolio leading-relaxed text-muted">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: Create `src/components/sections/Skills.tsx`**

```tsx
import { Section } from "@/components/ui/Section";
import type { SkillGroup } from "@/types/portfolio";

export function Skills({ skills }: { skills: SkillGroup[] }) {
  return (
    <Section id="skills" title="Skills">
      <div className="flex flex-col gap-6">
        {skills.map((group) => (
          <div key={group.title}>
            <h3 className="mb-1 font-medium">{group.title}</h3>
            <p className="mb-3 text-sm text-muted">{group.description}</p>
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-fg"
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
```

- [ ] **Step 5: Create `src/components/sections/Experience.tsx`**

```tsx
import { Section } from "@/components/ui/Section";
import type { Experience as ExperienceType } from "@/types/portfolio";

export function Experience({ experience }: { experience: ExperienceType[] }) {
  return (
    <Section id="experience" title="Experience">
      <div className="flex flex-col gap-8 border-l border-border pl-6">
        {experience.map((exp, i) => (
          <div key={`${exp.company}-${i}`} className="relative">
            <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium">{exp.role} · {exp.company}</h3>
              <span className="text-xs text-muted">{exp.timeframe}</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
              {exp.achievements.map((a, j) => (
                <li key={j}>{a}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 6: Create `src/components/sections/Projects.tsx`**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiArrowUpRight } from "react-icons/fi";
import { Section } from "@/components/ui/Section";
import type { Project } from "@/types/portfolio";

export function Projects({ projects }: { projects: Project[] }) {
  return (
    <Section id="projects" title="Projects">
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project, i) => (
          <div key={`${project.title}-${i}`} className="flex flex-col rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium">{project.title}</h3>
            <div className="mt-1 text-sm text-muted">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.map((t) => (
                <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{t}</span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {project.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                  {l.label} <FiArrowUpRight size={14} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 7: Create `src/components/sections/Education.tsx`**

```tsx
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
```

- [ ] **Step 8: Create `src/components/sections/Footer.tsx`**

```tsx
import { SocialLinks } from "@/components/ui/SocialLinks";
import type { SocialLink } from "@/types/portfolio";

export function Footer({ name, social }: { name: string; social: SocialLink[] }) {
  return (
    <footer className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-6 py-10 text-sm text-muted">
      <SocialLinks social={social} />
      <p>© {name}</p>
    </footer>
  );
}
```

- [ ] **Step 9: Verify all section components compile**

Run: `npx tsc --noEmit`
Expected: errors only from not-yet-updated `layout.tsx`/`page.tsx`/barrels — none from `src/components/sections/*` or `src/components/ui/*`.

- [ ] **Step 10: Commit**

```bash
git add src/components/sections src/components/ui
git commit -m "feat: add Tailwind section components"
```

### Task 9: Rebuild `layout.tsx` and `page.tsx`

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/layout.tsx`** entirely

```tsx
import type { Metadata } from "next";
import { ThemeScript } from "@/components/ui/ThemeScript";
import { PortfolioChat } from "@/components/PortfolioChat";
import { getContent } from "@/lib/content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { person } = await getContent();
  return {
    title: `${person.name} — ${person.role}`,
    description: `Portfolio of ${person.name}, ${person.role}.`,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <PortfolioChat />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx`** entirely

```tsx
import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Skills } from "@/components/sections/Skills";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Education } from "@/components/sections/Education";
import { Footer } from "@/components/sections/Footer";
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
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: errors now only from barrels (`src/resources/index.ts`, `src/components/index.ts`) and leftover Once UI files — addressed in Task 13.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: rebuild layout + home page with Tailwind sections"
```

---

## Phase 4 — Chat restyle

### Task 10: Restyle `PortfolioChat.tsx` to Tailwind

**Files:**
- Modify: `src/components/PortfolioChat.tsx`
- Delete: `src/components/PortfolioChat.module.scss`

- [ ] **Step 1: Remove the SCSS import** line `import styles from "@/components/PortfolioChat.module.scss";` and replace every `className={styles.x}` usage with Tailwind classes. Keep ALL logic, state, effects, the `/api/chat` fetch, streaming parse, suggestions, and `parseSources`/`buildRequestHistory` helpers unchanged. Use this structure for the render (adapt to the existing JSX element tree — same elements, new classes):

```tsx
// Floating toggle button (closed state)
<button
  type="button"
  onClick={() => setIsOpen(true)}
  className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:opacity-90"
  aria-label="Open chat"
>
  <FiMessageCircle size={22} />
</button>

// Panel (open state) — container
<div className="fixed bottom-5 right-5 z-50 flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl">
  {/* header */}
  <div className="flex items-center justify-between border-b border-border px-4 py-3">
    <span className="text-sm font-medium">Ask about Rohit</span>
    <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chat" className="text-muted hover:text-fg">
      <FiX size={18} />
    </button>
  </div>
  {/* messages: ref={messagesRef} */}
  <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
    {/* each message bubble */}
    {/* user:    className="ml-auto max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-sm text-white" */}
    {/* assistant: className="mr-auto max-w-[85%] rounded-2xl bg-card px-3 py-2 text-sm text-fg" */}
  </div>
  {/* input form */}
  <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
    <input
      value={question}
      onChange={(e) => setQuestion(e.target.value)}
      placeholder="Ask a question…"
      className="flex-1 rounded-full border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
    />
    <button type="submit" disabled={isLoading} className="rounded-full bg-accent p-2 text-white disabled:opacity-50">
      <FiSend size={16} />
    </button>
  </form>
</div>
```

Render markdown inside assistant bubbles with the existing `<ReactMarkdown remarkPlugins={[remarkGfm]}>`. Keep suggestion chips styled as `rounded-full border border-border px-3 py-1 text-xs hover:bg-card`.

- [ ] **Step 2: Delete the SCSS**

```bash
git rm src/components/PortfolioChat.module.scss
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit src/components/PortfolioChat.tsx`
Expected: no errors (no remaining `styles.` references).

- [ ] **Step 4: Commit**

```bash
git add src/components/PortfolioChat.tsx
git commit -m "style: restyle PortfolioChat with Tailwind"
```

---

## Phase 5 — Admin auth

### Task 11: `admin-auth.ts` (TDD)

**Files:**
- Create: `src/lib/admin-auth.ts`, `src/lib/admin-auth.test.ts`

- [ ] **Step 1: Write failing test `src/lib/admin-auth.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { sessionToken, verifyToken } from "./admin-auth";

describe("admin-auth", () => {
  it("verifies a token built from the same password", () => {
    const token = sessionToken("hunter2");
    expect(verifyToken(token, "hunter2")).toBe(true);
  });

  it("rejects a token built from a different password", () => {
    const token = sessionToken("hunter2");
    expect(verifyToken(token, "wrong")).toBe(false);
  });

  it("rejects empty/garbage tokens", () => {
    expect(verifyToken("", "hunter2")).toBe(false);
    expect(verifyToken("garbage", "hunter2")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/admin-auth.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/admin-auth.ts`**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";

export function sessionToken(password: string): string {
  return createHmac("sha256", password).update("portfolio-admin").digest("hex");
}

export function verifyToken(token: string | undefined, password: string): boolean {
  if (!token || !password) return false;
  const expected = sessionToken(password);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Read the admin password from env; throws if unset so misconfig is loud. */
export function adminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD is not set");
  return pw;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/lib/admin-auth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-auth.ts src/lib/admin-auth.test.ts
git commit -m "feat: add admin HMAC session helpers with tests"
```

### Task 12: Admin API routes (login, logout, content)

**Files:**
- Create: `src/app/api/admin/login/route.ts`, `src/app/api/admin/logout/route.ts`, `src/app/api/admin/content/route.ts`

- [ ] **Step 1: Create `src/app/api/admin/login/route.ts`**

```ts
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, sessionToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  if (!password || password !== adminPassword()) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sessionToken(adminPassword()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
```

- [ ] **Step 2: Create `src/app/api/admin/logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
```

- [ ] **Step 3: Create `src/app/api/admin/content/route.ts`**

```ts
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, verifyToken } from "@/lib/admin-auth";
import { getContent, saveContent } from "@/lib/content";
import { resetVectorStore } from "@/lib/portfolio-rag";
import { validateContent } from "@/lib/validate-content";

export const runtime = "nodejs";

async function isAuthed(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyToken(token, adminPassword());
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getContent());
}

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const { ok, errors } = validateContent(body);
  if (!ok) return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  await saveContent(body);
  resetVectorStore();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit src/app/api/admin/content/route.ts src/app/api/admin/login/route.ts src/app/api/admin/logout/route.ts`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin
git commit -m "feat: add admin login/logout/content API routes"
```

---

## Phase 6 — Admin UI

### Task 13: Admin login page + guarded admin page shell

**Files:**
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Create `src/app/admin/login/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push("/admin");
    else setError("Invalid password.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold">Admin login</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-white">Log in</button>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/page.tsx`** (server-guards, then renders the client form)

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminPassword, verifyToken } from "@/lib/admin-auth";
import { getContent } from "@/lib/content";
import { AdminForm } from "./AdminForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token, adminPassword())) redirect("/admin/login");
  const content = await getContent();
  return <AdminForm initial={content} />;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit src/app/admin/login/page.tsx`
Expected: no errors (admin/page.tsx will error until Task 14 creates `AdminForm` — acceptable; verify after Task 14).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/login/page.tsx src/app/admin/page.tsx
git commit -m "feat: add admin login + guarded admin shell"
```

### Task 14: `AdminForm` editor

**Files:**
- Create: `src/app/admin/AdminForm.tsx`

- [ ] **Step 1: Create `src/app/admin/AdminForm.tsx`** — a client component editing the full document via local state and JSON-shaped fields. Uses a generic immutable-update helper to keep it compact.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PortfolioContent } from "@/types/portfolio";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminForm({ initial }: { initial: PortfolioContent }) {
  const router = useRouter();
  const [data, setData] = useState<PortfolioContent>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  function update(mutator: (draft: PortfolioContent) => void) {
    setData((prev) => {
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
  }

  async function save() {
    setState("saving");
    setMessage("");
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setState("saved");
      setMessage("Saved. Public site + chat updated.");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setState("error");
      setMessage(body.errors?.join("; ") || body.error || "Save failed.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const field = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent";
  const label = "text-xs font-medium text-muted";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit portfolio</h1>
        <div className="flex items-center gap-3">
          <button type="button" onClick={logout} className="text-sm text-muted hover:text-fg">Log out</button>
          <button type="button" onClick={save} disabled={state === "saving"}
                  className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">
            {state === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {message ? (
        <p className={state === "error" ? "text-sm text-red-500" : "text-sm text-green-600"}>{message}</p>
      ) : null}

      {/* Profile */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-medium">Profile</legend>
        {(["name", "role", "email", "avatar", "location"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1">
            <span className={label}>{key}</span>
            <input className={field} value={data.person[key]}
                   onChange={(e) => update((d) => { d.person[key] = e.target.value; })} />
          </label>
        ))}
      </fieldset>

      {/* About */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-medium">About</legend>
        <textarea className={`${field} min-h-28`} value={data.about.intro}
                  onChange={(e) => update((d) => { d.about.intro = e.target.value; })} />
      </fieldset>

      {/* Social */}
      <ArrayEditor
        legend="Social links"
        items={data.social}
        onAdd={() => update((d) => { d.social.push({ name: "", icon: "github", link: "" }); })}
        onRemove={(i) => update((d) => { d.social.splice(i, 1); })}
        render={(s, i) => (
          <div className="grid grid-cols-3 gap-2">
            {(["name", "icon", "link"] as const).map((k) => (
              <input key={k} className={field} placeholder={k} value={s[k]}
                     onChange={(e) => update((d) => { d.social[i][k] = e.target.value; })} />
            ))}
          </div>
        )}
      />

      {/* Experience */}
      <ArrayEditor
        legend="Experience"
        items={data.experience}
        onAdd={() => update((d) => { d.experience.push({ company: "", role: "", timeframe: "", achievements: [""] }); })}
        onRemove={(i) => update((d) => { d.experience.splice(i, 1); })}
        render={(exp, i) => (
          <div className="flex flex-col gap-2">
            {(["company", "role", "timeframe"] as const).map((k) => (
              <input key={k} className={field} placeholder={k} value={exp[k]}
                     onChange={(e) => update((d) => { d.experience[i][k] = e.target.value; })} />
            ))}
            <textarea className={`${field} min-h-20`} placeholder="achievements (one per line)"
                      value={exp.achievements.join("\n")}
                      onChange={(e) => update((d) => { d.experience[i].achievements = e.target.value.split("\n"); })} />
          </div>
        )}
      />

      {/* Projects */}
      <ArrayEditor
        legend="Projects"
        items={data.projects}
        onAdd={() => update((d) => { d.projects.push({ title: "", description: "", tags: [], links: [] }); })}
        onRemove={(i) => update((d) => { d.projects.splice(i, 1); })}
        render={(p, i) => (
          <div className="flex flex-col gap-2">
            <input className={field} placeholder="title" value={p.title}
                   onChange={(e) => update((d) => { d.projects[i].title = e.target.value; })} />
            <textarea className={`${field} min-h-20`} placeholder="description (markdown)" value={p.description}
                      onChange={(e) => update((d) => { d.projects[i].description = e.target.value; })} />
            <input className={field} placeholder="tags (comma separated)" value={p.tags.join(", ")}
                   onChange={(e) => update((d) => { d.projects[i].tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean); })} />
            <input className={field} placeholder="link url" value={p.links[0]?.url ?? ""}
                   onChange={(e) => update((d) => { d.projects[i].links = e.target.value ? [{ label: "Link", url: e.target.value }] : []; })} />
          </div>
        )}
      />

      {/* Education */}
      <ArrayEditor
        legend="Education"
        items={data.education}
        onAdd={() => update((d) => { d.education.push({ name: "", description: "" }); })}
        onRemove={(i) => update((d) => { d.education.splice(i, 1); })}
        render={(ed, i) => (
          <div className="flex flex-col gap-2">
            <input className={field} placeholder="name" value={ed.name}
                   onChange={(e) => update((d) => { d.education[i].name = e.target.value; })} />
            <input className={field} placeholder="description" value={ed.description}
                   onChange={(e) => update((d) => { d.education[i].description = e.target.value; })} />
          </div>
        )}
      />

      {/* Skills: edit description; tags as comma list */}
      <ArrayEditor
        legend="Skills"
        items={data.skills}
        onAdd={() => update((d) => { d.skills.push({ title: "", description: "", tags: [] }); })}
        onRemove={(i) => update((d) => { d.skills.splice(i, 1); })}
        render={(sk, i) => (
          <div className="flex flex-col gap-2">
            <input className={field} placeholder="title" value={sk.title}
                   onChange={(e) => update((d) => { d.skills[i].title = e.target.value; })} />
            <textarea className={`${field} min-h-16`} placeholder="description" value={sk.description}
                      onChange={(e) => update((d) => { d.skills[i].description = e.target.value; })} />
            <input className={field} placeholder="tags (comma separated)"
                   value={sk.tags.map((t) => t.name).join(", ")}
                   onChange={(e) => update((d) => {
                     d.skills[i].tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                       .map((name) => ({ name, icon: "rocket" }));
                   })} />
          </div>
        )}
      />
    </main>
  );
}

function ArrayEditor<T>({
  legend, items, render, onAdd, onRemove,
}: {
  legend: string;
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <legend className="text-lg font-medium">{legend}</legend>
        <button type="button" onClick={onAdd} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-card">+ Add</button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex justify-end">
            <button type="button" onClick={() => onRemove(i)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
          {render(item, i)}
        </div>
      ))}
    </fieldset>
  );
}
```

> Note: editing a skill's tags here resets each tag icon to `"rocket"`; that is acceptable for a mini-CMS (icons are cosmetic). Existing seeded icons are preserved unless the user edits that skill's tag list.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit src/app/admin/AdminForm.tsx src/app/admin/page.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/AdminForm.tsx
git commit -m "feat: add admin content editor form"
```

---

## Phase 7 — Cleanup & verification

### Task 15: Delete Once UI files, prune barrels, update env

**Files:**
- Delete: many (below)
- Modify: `src/resources/index.ts`, `src/types/index.ts`, `src/components/index.ts`, `.env.example`

- [ ] **Step 1: Delete Once UI–coupled files and dead assets**

```bash
git rm -r \
  src/components/Header.tsx src/components/Header.module.scss \
  src/components/Footer.tsx src/components/Footer.module.scss \
  src/components/ProjectCard.tsx src/components/ProjectCard.module.scss \
  src/components/HeadingLink.tsx src/components/HeadingLink.module.scss \
  src/components/RouteGuard.tsx src/components/Providers.tsx \
  src/components/ScrollToHash.tsx src/components/mdx.tsx \
  src/components/breakpoints.scss \
  src/components/about src/components/work src/components/blog \
  src/resources/once-ui.config.ts src/resources/custom.css src/resources/content.tsx \
  src/app/work src/app/api/og src/app/api/authenticate src/app/api/check-auth \
  public/soul.md
git rm public/trademarks/wordmark-dark.svg public/trademarks/wordmark-light.svg 2>/dev/null || true
```

> If any path above does not exist, remove it from the command and continue. Verify the project's actual component dirs first with `ls src/components`.

- [ ] **Step 2: Replace `src/resources/index.ts`** with a thin re-export so any lingering `@/resources` imports resolve (or are removed):

```ts
export { getContent } from "@/lib/content";
```

- [ ] **Step 3: Replace `src/components/index.ts`**

```ts
export { PortfolioChat } from "@/components/PortfolioChat";
export { ThemeToggle } from "@/components/ui/ThemeToggle";
```

- [ ] **Step 4: Replace `src/types/index.ts`**

```ts
export * from "./portfolio";
```

Then delete the obsolete `src/types/config.types.ts` and `src/types/content.types.ts` **only if** nothing imports them: run `grep -rn "config.types\|content.types\|@/types\"" src` and remove dead imports; then `git rm src/types/config.types.ts src/types/content.types.ts`.

- [ ] **Step 5: Add `ADMIN_PASSWORD` to `.env.example`**

Append:

```
# Admin CMS password (guards /admin only)
ADMIN_PASSWORD=change-me
```

- [ ] **Step 6: Grep for dangling references**

Run: `grep -rn "@once-ui-system\|once-ui.config\|next-mdx-remote\|gray-matter\|from \"@/resources\"" src`
Expected: no results (fix any that remain).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Once UI files, prune barrels, add ADMIN_PASSWORD"
```

### Task 16: Full build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + unit tests + build**

Run: `npx tsc --noEmit && npm run test && npm run build`
Expected: tsc clean; Vitest all pass (validate-content, content, admin-auth); `next build` succeeds.

- [ ] **Step 2: Add a placeholder resume so the button resolves**

```bash
[ -f public/resume.pdf ] || printf '%%PDF-1.4 placeholder' > public/resume.pdf
```

(User replaces with the real PDF later.)

- [ ] **Step 3: Manual run**

Set `ADMIN_PASSWORD=test123` in `.env`, then run `npm run dev` and verify:
- Home renders; toggling theme switches light/dark and persists across reload (no flash).
- GitHub / LinkedIn / Email links open correctly; **Download Resume** serves `/resume.pdf`.
- All sections show real content; Projects shows the two placeholders.
- Chat widget opens, a question (e.g. "What is Rohit's current role?") streams an answer (requires the Ollama env reachable).
- `/admin` redirects to `/admin/login`; wrong password is rejected; correct password loads the editor.
- Change `role`, Save → success message; reload `/` shows the new role; ask the chat "what's Rohit's role" and confirm it reflects the edit (vector cache was reset).

- [ ] **Step 4: Final commit**

```bash
git add public/resume.pdf
git commit -m "chore: add placeholder resume.pdf"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** single page (Tasks 8–9) ✓; light/dark toggle (Task 6) ✓; social + resume (Tasks 7–8) ✓; skills/experience/projects/education (Task 8) ✓; RAG preserved + content-driven (Task 5) ✓; chat restyle (Task 10) ✓; content.json + content.ts abstraction + atomic write (Tasks 2,4) ✓; admin page + array add/remove + save API + validation (Tasks 12–14) ✓; admin auth via ADMIN_PASSWORD cookie (Tasks 11–13) ✓; public site ungated (no middleware guard added) ✓; removals incl. soul.md (Task 15) ✓; cache-reset keeps chat in sync (Task 5 + 12) ✓.
- **Placeholder scan:** project content is intentional placeholder data (a product requirement), not a plan gap. No TBDs in code steps.
- **Type consistency:** `getContent`/`saveContent`, `validateContent` (`{ok,errors}`), `sessionToken`/`verifyToken`/`adminPassword`/`ADMIN_COOKIE`, `resetVectorStore`, and the `PortfolioContent` field names are used identically across tasks.
- **Known minor limitation:** editing a skill's tags resets tag icons to a default (documented in Task 14).
