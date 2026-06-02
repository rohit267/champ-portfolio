# Tailwind Portfolio + Mini-CMS — Design

**Date:** 2026-06-02
**Owner:** Rohit Mahto
**Status:** Approved (pending spec review)

## Goal

Replace the bulky Once UI `magic-portfolio` template with a clean, single-scrolling-page
portfolio built on Tailwind CSS. Preserve the existing LangChain RAG AI chat. Add a
password-protected `/admin` mini-CMS that edits a JSON content file backing both the
public site and the AI chat.

## Non-Goals

- No multi-page routing (single scrolling page only).
- No external database — content lives in a JSON file on disk (self-hosted Node).
- No rich-text WYSIWYG editor; the admin uses plain form fields with markdown strings.
- No site-wide password protection (only `/admin` is gated).

## Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Styling | Strip Once UI, rebuild with **Tailwind CSS v4** |
| AI chat | **Keep full RAG** (LangChain + in-memory vector store), preserve pipeline |
| Chat provider | **Keep remote Ollama** (env-configurable, unchanged) |
| Layout | **Single scrolling page** with sticky anchor nav |
| Theme | **Light + dark toggle**, class-based, persisted to `localStorage` |
| Projects | **Placeholder cards** to fill later |
| Resume | **Download button → `/resume.pdf`** (user adds the file) |
| Hosting | **Self-hosted Node** (`next start`) |
| CMS persistence | **Write `content.json` to disk** via admin API |
| Admin auth | **Single `ADMIN_PASSWORD` env** + signed httpOnly cookie |

## Architecture

### Content as single source of truth

- All content moves from `src/resources/content.tsx` (TSX/JSX) → **`src/data/content.json`**
  (plain data; all `description` fields become **markdown strings**, not JSX).
- **`src/lib/content.ts`** is the only module that reads/writes the JSON — the abstraction
  point for swapping storage later. Exposes `getContent()` and `saveContent(data)`.
- `saveContent` writes **atomically**: serialize → write `content.json.tmp` → `rename`.
- The public site (server components) and `src/lib/portfolio-rag.ts` both import content via
  `getContent()`. Editing in admin updates the site **and** the chat's knowledge base.
- A TypeScript type (`src/types/content.ts`) defines the `PortfolioContent` shape and is the
  contract shared by the site, the admin form, and the save-API validator.

### content.json shape (high level)

```jsonc
{
  "person": { "firstName", "lastName", "name", "role", "avatar", "email", "location", "languages": [] },
  "social": [ { "name", "icon", "link" } ],
  "about": { "intro": "<markdown>" },
  "skills": [ { "title", "description": "<markdown>", "tags": [ { "name", "icon" } ] } ],
  "experience": [ { "company", "timeframe", "role", "achievements": ["<markdown>"] } ],
  "projects": [ { "title", "description": "<markdown>", "tags": [string], "links": [ { "label", "url" } ] } ],
  "education": [ { "name", "description": "<markdown>" } ]
}
```

The initial `content.json` is seeded by porting the existing real data from `content.tsx`
(person, social, intro, 5 experiences, 4 skill groups, 3 education entries) plus 2–3
placeholder projects.

### Public page (`src/app/page.tsx`)

Server component that calls `getContent()` and composes sections. Sticky top nav with
smooth-scroll anchors. Sections in order:

1. **Hero** — avatar, name, role, one-line intro, social links (GitHub · LinkedIn · Email),
   **Download Resume** button (`/resume.pdf`), theme toggle.
2. **About** — intro markdown.
3. **Skills** — skill categories rendered as tag groups.
4. **Experience** — vertical timeline of roles.
5. **Projects** — placeholder cards (title, description, tags, links).
6. **Education** — institutions.
7. **Footer** — copyright + social links.

Floating **PortfolioChat** widget (bottom-right) is mounted in the layout.

### Components (Tailwind, no Once UI)

`Nav`, `Hero`, `About`, `Skills`, `Experience`, `Projects`, `Education`, `Footer`,
`ThemeToggle`, `SocialLinks`, `PortfolioChat` (rebuilt from SCSS → Tailwind, logic preserved).
Markdown fields render via the existing `react-markdown` + `remark-gfm`.

### Theme

- Class-based dark mode (`.dark` on `<html>`).
- Inline blocking script in `<head>` sets the initial class from `localStorage` (fallback
  `prefers-color-scheme`) to prevent flash-of-wrong-theme.
- `ThemeToggle` flips the class and persists the choice.

### AI Chat (preserved)

- `src/app/api/chat/route.ts` — **unchanged**.
- `src/lib/portfolio-rag.ts` — **one edit**: ingest the `projects` array and other content
  from `getContent()` instead of reading `work/projects/*.mdx`. Embedding/retrieval/streaming
  logic and the existing system prompt are unchanged.
- `PortfolioChat.tsx` — same logic (streaming, history, suggestions, markdown), Tailwind styling.

### Admin / Mini-CMS

- **`/admin`** — client form with collapsible sections mirroring `PortfolioContent`. Array
  sections (social, skills, experience, projects, education) support **add / remove / reorder**.
  Loads current content via a GET endpoint; **Save** POSTs the full document.
- **`/api/admin/content`** — `GET` returns current content; `POST` validates shape against the
  type contract, then `saveContent()` writes atomically. Rejects malformed payloads (missing
  required fields, wrong array types) with a 400 before touching disk.
- **`/api/admin/login`** — compares submitted password to `ADMIN_PASSWORD`, sets a signed,
  httpOnly cookie on success.
- **Auth guard** — `middleware.ts` (or per-route server check) protects `/admin` and
  `/api/admin/*` only; everything else is public. Unauthenticated `/admin` redirects to a
  login form.

### Removals

- Dependency `@once-ui-system/core` and all components importing it: `Header`, `Footer`,
  `ProjectCard`, `Providers`, `RouteGuard`, `about/*`, `work/*`, `blog/*`, `mdx.tsx`,
  `HeadingLink`, `ScrollToHash`, SCSS files, `breakpoints.scss`.
- `src/resources/once-ui.config.ts`, `custom.css`.
- OG-image routes (`api/og/*`), MDX project files + `/work` routes, `api/authenticate`,
  `api/check-auth`.
- Stray `public/soul.md` (unreferenced).
- Deps to remove (verify unused first): `@next/mdx`, `@mdx-js/loader`, `next-mdx-remote`,
  `gray-matter`, `sass`, `transliteration`, `classnames`.
- Deps to add: `tailwindcss` v4, `@tailwindcss/postcss`, `postcss`.
- Deps to keep: LangChain stack, `react-icons`, `react-markdown`, `remark-gfm`.

## Error Handling

- `getContent()` throws a clear error if `content.json` is missing/unparseable; the page
  surfaces a minimal fallback rather than crashing the build.
- Save API never writes an invalid document (validate-before-write + atomic rename).
- Chat errors already handled by existing route (timeouts, provider failures) — unchanged.
- Theme script is guarded so SSR/no-JS degrades to the default theme.

## Verification

- `next build` passes; lint clean.
- `next dev`: page renders in light **and** dark; all social links + resume button work.
- AI chat answers a question end-to-end against Ollama.
- `/admin`: login rejects wrong password; editing a field + Save updates `content.json`;
  reload shows the change on the public page; the chat reflects edited content.

## Open Items (user-supplied later)

- Real `resume.pdf` into `public/`.
- Real project content (replaces placeholders).
- `ADMIN_PASSWORD` set in `.env`.
