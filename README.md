# Rohit Mahto — Portfolio

A simple, single-page personal portfolio built with **Next.js + Tailwind CSS**, featuring:

- Hero with social links (GitHub, LinkedIn, Email) and a resume download (direct link)
- About, Skills, Experience, Projects, and Education sections
- A **RAG-powered AI chat** that answers questions about Rohit (LangChain + Ollama)
- A password-protected **`/admin` mini-CMS** to edit all content from the browser

## Content

All portfolio content lives in a single file: `src/data/content.json`.
The public page and the AI chat both read from it, so editing it (directly or via `/admin`)
updates everything at once.

## Develop

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000`. The admin editor is at `/admin`.

## Environment

Copy `.env.example` to `.env` and set:

- `ADMIN_PASSWORD` — guards `/admin` and the content save API
- `NEXT_PUBLIC_BASE_URL` — your public domain; used for SEO canonical URLs, Open Graph,
  sitemap, and robots
- RAG provider settings (`RAG_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`,
  `OLLAMA_EMBEDDING_MODEL`, or the OpenAI equivalents) — power the AI chat

The resume button links to a direct-download URL you set in `/admin` (Profile → resume URL),
e.g. a Google Drive or hosted PDF link — no file upload needed.

The AI chat needs a reachable model/embedding provider; with the default Ollama setup,
the configured server must be up and have the embedding model pulled.

## Deploy

Built for a **self-hosted Node** server:

```bash
pnpm build
pnpm start
```

The admin CMS writes `content.json` to disk, which persists on a Node host.

## Test

```bash
pnpm test   # Vitest — content model, validator, and admin auth
```
