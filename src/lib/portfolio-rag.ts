import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { getContent } from "@/lib/content";

type RagProvider = "openai" | "openai-compatible" | "ollama";

export type PortfolioChatHistoryMessage = {
	role: "assistant" | "user";
	content: string;
};

type PortfolioAnswer = {
	answer: string;
	sources: string[];
};

type StreamPortfolioAnswer = {
	stream: AsyncIterable<string>;
	sources: string[];
};

let vectorStorePromise: Promise<MemoryVectorStore> | undefined;
const EMBEDDING_TIMEOUT_MS = Number(process.env.RAG_EMBEDDING_TIMEOUT_MS || 30000);

/** Clears the cached corpus so the next request rebuilds it (call after content edits). */
export function resetVectorStore() {
	vectorStorePromise = undefined;
}

function shouldLogRag() {
	return process.env.NODE_ENV !== "production" || process.env.RAG_DEBUG === "true";
}

function logRag(requestId: string, message: string, details?: Record<string, unknown>) {
	if (!shouldLogRag()) {
		return;
	}

	console.log(`[portfolio-rag:${requestId}] ${message}`, details || "");
}

function elapsed(startedAt: number) {
	return `${Math.round(performance.now() - startedAt)}ms`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	try {
		return await Promise.race([
			promise,
			new Promise<T>((_, reject) => {
				timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
			}),
		]);
	} finally {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}
}

function contentToString(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.map((item) => {
				if (typeof item === "string") {
					return item;
				}

				if (item && typeof item === "object" && "text" in item) {
					return String(item.text || "");
				}

				return "";
			})
			.join("");
	}

	return "";
}

function getProvider(): RagProvider {
	const provider = (process.env.RAG_PROVIDER || "openai").toLowerCase();

	if (provider === "ollama" || provider === "openai-compatible" || provider === "openai") {
		return provider;
	}

	throw new Error("RAG_PROVIDER must be one of: openai, openai-compatible, ollama.");
}

function getOpenAIClientOptions() {
	const baseURL = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE_URL;

	return {
		apiKey: process.env.OPENAI_API_KEY || "not-needed",
		...(baseURL ? { configuration: { baseURL } } : {}),
	};
}

function createEmbeddings(requestId: string) {
	const provider = getProvider();

	if (provider === "ollama") {
		logRag(requestId, "creating Ollama embeddings", {
			baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
			model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
		});

		return new OllamaEmbeddings({
			baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
			model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
		});
	}

	if (!process.env.OPENAI_API_KEY && provider === "openai") {
		throw new Error("OPENAI_API_KEY is not configured.");
	}

	logRag(requestId, "creating OpenAI-compatible embeddings", {
		provider,
		baseUrl: process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1",
		model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
	});

	return new OpenAIEmbeddings({
		model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
		...getOpenAIClientOptions(),
	});
}

function createChatModel(requestId: string) {
	const provider = getProvider();

	if (provider === "ollama") {
		logRag(requestId, "creating Ollama chat model", {
			baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
			model: process.env.OLLAMA_MODEL || "llama3.1",
		});

		return new ChatOllama({
			baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
			model: process.env.OLLAMA_MODEL || "llama3.1",
			temperature: 0.2,
		});
	}

	if (!process.env.OPENAI_API_KEY && provider === "openai") {
		throw new Error("OPENAI_API_KEY is not configured.");
	}

	logRag(requestId, "creating OpenAI-compatible chat model", {
		provider,
		baseUrl: process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1",
		model: process.env.OPENAI_MODEL || "gpt-4o-mini",
	});

	return new ChatOpenAI({
		model: process.env.OPENAI_MODEL || "gpt-4o-mini",
		temperature: 0.2,
		...getOpenAIClientOptions(),
	});
}

function cleanText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function formatConversationHistory(history: PortfolioChatHistoryMessage[]) {
	const formattedHistory = history
		.slice(-15)
		.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${cleanText(message.content)}`)
		.join("\n");

	return formattedHistory || "No prior conversation.";
}

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

async function getVectorStore(requestId: string) {
	if (vectorStorePromise) {
		logRag(requestId, "using cached vector store");
		return vectorStorePromise;
	}

	vectorStorePromise ??= (async () => {
		const startedAt = performance.now();
		logRag(requestId, "building vector store", {
			provider: getProvider(),
		});

		const splitter = new RecursiveCharacterTextSplitter({
			chunkSize: 700,
			chunkOverlap: 120,
		});
		const sourceDocuments = await buildPortfolioDocuments(requestId);
		const documents = await splitter.splitDocuments(sourceDocuments);
		logRag(requestId, "split documents", {
			sourceDocuments: sourceDocuments.length,
			chunks: documents.length,
			elapsed: elapsed(startedAt),
		});

		const vectorStore = await withTimeout(
			MemoryVectorStore.fromDocuments(documents, createEmbeddings(requestId)),
			EMBEDDING_TIMEOUT_MS,
			`Embedding generation timed out after ${EMBEDDING_TIMEOUT_MS}ms. Check RAG provider settings and use a real embedding model, for example OLLAMA_EMBEDDING_MODEL=nomic-embed-text.`,
		);
		logRag(requestId, "vector store ready", {
			chunks: documents.length,
			elapsed: elapsed(startedAt),
		});

		return vectorStore;
	})();

	vectorStorePromise.catch(() => {
		vectorStorePromise = undefined;
	});

	return vectorStorePromise;
}

export async function answerPortfolioQuestion(
	question: string,
	requestId = "unknown",
	history: PortfolioChatHistoryMessage[] = [],
): Promise<PortfolioAnswer> {
	logRag(requestId, "answering portfolio question", {
		provider: getProvider(),
		questionLength: question.length,
		historyCount: history.length,
	});

	const vectorStore = await getVectorStore(requestId);
	const retrievalStartedAt = performance.now();
	const relevantDocuments = await vectorStore.similaritySearch(question, 5);
	logRag(requestId, "retrieved relevant documents", {
		count: relevantDocuments.length,
		sources: relevantDocuments.map((document) => document.metadata.source),
		elapsed: elapsed(retrievalStartedAt),
	});

	const context = relevantDocuments
		.map((document, index) => {
			const source = String(document.metadata.source || `Source ${index + 1}`);
			return `[${source}]\n${document.pageContent}`;
		})
		.join("\n\n");

	const { person } = await getContent();
	const model = createChatModel(requestId);
	const modelStartedAt = performance.now();
	logRag(requestId, "calling chat model");

	const response = await model.invoke([
		{
			role: "system",
			content: [
				`You are ${person.name}'s portfolio assistant.`,
				"Answer only from the supplied portfolio context.",
				"If the answer is not in the context, say you do not have that information in the portfolio.",
				"Be concise, accurate, and helpful for recruiters, collaborators, or visitors.",
			].join(" "),
		},
		{
			role: "user",
			content: [
				`Recent conversation:\n${formatConversationHistory(history)}`,
				`Portfolio context:\n${context}`,
				`Question: ${question}`,
			].join("\n\n"),
		},
	]);
	logRag(requestId, "chat model responded", {
		elapsed: elapsed(modelStartedAt),
	});

	const sources = Array.from(
		new Set(relevantDocuments.map((document) => String(document.metadata.source || "Portfolio")).filter(Boolean)),
	);

	return {
		answer: typeof response.content === "string" ? response.content : JSON.stringify(response.content),
		sources,
	};
}

export async function streamPortfolioQuestion(
	question: string,
	requestId = "unknown",
	history: PortfolioChatHistoryMessage[] = [],
): Promise<StreamPortfolioAnswer> {
	logRag(requestId, "streaming portfolio answer", {
		provider: getProvider(),
		questionLength: question.length,
		historyCount: history.length,
	});

	const vectorStore = await getVectorStore(requestId);
	const retrievalStartedAt = performance.now();
	const relevantDocuments = await vectorStore.similaritySearch(question, 5);
	logRag(requestId, "retrieved relevant documents for stream", {
		count: relevantDocuments.length,
		sources: relevantDocuments.map((document) => document.metadata.source),
		elapsed: elapsed(retrievalStartedAt),
	});

	const context = relevantDocuments
		.map((document, index) => {
			const source = String(document.metadata.source || `Source ${index + 1}`);
			return `[${source}]\n${document.pageContent}`;
		})
		.join("\n\n");
	const sources = Array.from(
		new Set(relevantDocuments.map((document) => String(document.metadata.source || "Portfolio")).filter(Boolean)),
	);
	const { person } = await getContent();
	const model = createChatModel(requestId);
	const modelStartedAt = performance.now();
	logRag(requestId, "calling streaming chat model");

	const responseStream = await model.stream([
		{
			role: "system",
			content: [
				`You are ${person.name}'s portfolio assistant.`,
				"Answer only from the supplied portfolio context.",
				"If the answer is not in the context, say you do not have that information in the portfolio.",
				"Format answers as concise markdown. Use short lists when useful.",
			].join(" "),
		},
		{
			role: "user",
			content: [
				`Recent conversation:\n${formatConversationHistory(history)}`,
				`Portfolio context:\n${context}`,
				`Question: ${question}`,
			].join("\n\n"),
		},
	]);

	async function* streamText() {
		for await (const chunk of responseStream) {
			const text = contentToString(chunk.content);
			if (text) {
				yield text;
			}
		}

		logRag(requestId, "streaming chat model completed", {
			elapsed: elapsed(modelStartedAt),
		});
	}

	return {
		stream: streamText(),
		sources,
	};
}
