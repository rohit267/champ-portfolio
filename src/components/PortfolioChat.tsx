"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiClock, FiMessageCircle, FiRefreshCcw, FiSend, FiX } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
	id: string;
	role: "assistant" | "user";
	content: string;
	sources?: string[];
	isStreaming?: boolean;
};

const CHAT_TIMEOUT_MS = 45000;
const LAST_QUESTION_KEY = "portfolio-chat-last-question";
const SUGGESTIONS = [
	"What is Rohit's current role?",
	"What tech stack does Rohit use?",
	"Summarize Rohit's work experience",
	"What payment integrations has Rohit built?",
];

function parseSources(content: string) {
	const match = content.match(/\n\n<!-- sources:([\s\S]*?) -->$/);

	if (!match) {
		return { content, sources: undefined };
	}

	try {
		return {
			content: content.slice(0, match.index).trim(),
			sources: JSON.parse(match[1]) as string[],
		};
	} catch {
		return { content, sources: undefined };
	}
}

function buildRequestHistory(messages: Message[]) {
	return messages
		.filter((message) => message.id !== "welcome" && message.content.trim() && !message.isStreaming)
		.map((message) => ({
			role: message.role,
			content: message.content,
		}))
		.slice(-15);
}

export function PortfolioChat() {
	const [isOpen, setIsOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [lastQuestion, setLastQuestion] = useState("");
	const messagesRef = useRef<HTMLDivElement>(null);
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "welcome",
			role: "assistant",
			content: "Hi, I can answer questions about Rohit's experience, skills, education, and projects.",
		},
	]);
	useEffect(() => {
		setLastQuestion(window.localStorage.getItem(LAST_QUESTION_KEY) || "");
	}, []);

	useEffect(() => {
		messagesRef.current?.scrollTo({
			top: messagesRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, []);

	useEffect(() => {
		messagesRef.current?.scrollTo({
			top: messagesRef.current.scrollHeight,
			behavior: isLoading ? "smooth" : "auto",
		});
	});

	function updateAssistantMessage(id: string, nextMessage: Partial<Message>) {
		setMessages((currentMessages) =>
			currentMessages.map((message) => (message.id === id ? { ...message, ...nextMessage } : message)),
		);
	}

	function applyQuestion(nextQuestion: string) {
		setQuestion(nextQuestion);
	}

	async function submitQuestion(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedQuestion = question.trim();
		if (!trimmedQuestion || isLoading) {
			return;
		}

		setQuestion("");
		setIsLoading(true);
		setLastQuestion(trimmedQuestion);
		window.localStorage.setItem(LAST_QUESTION_KEY, trimmedQuestion);
		const assistantMessageId = crypto.randomUUID();
		setMessages((currentMessages) => [
			...currentMessages,
			{ id: crypto.randomUUID(), role: "user", content: trimmedQuestion },
			{
				id: assistantMessageId,
				role: "assistant",
				content: "",
				isStreaming: true,
			},
		]);

		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					history: buildRequestHistory(messages),
					question: trimmedQuestion,
					stream: true,
				}),
				signal: controller.signal,
			});

			if (!response.ok || !response.body) {
				const payload = (await response.json().catch(() => null)) as { error?: string } | null;
				throw new Error(payload?.error || "The chat service returned an error.");
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let answer = "";

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				answer += decoder.decode(value, { stream: true });
				const parsed = parseSources(answer);
				updateAssistantMessage(assistantMessageId, {
					content: parsed.content || answer,
					sources: parsed.sources,
				});
			}

			answer += decoder.decode();
			const parsed = parseSources(answer);
			updateAssistantMessage(assistantMessageId, {
				content: parsed.content || "I could not answer that question right now.",
				sources: parsed.sources,
				isStreaming: false,
			});
		} catch (error) {
			const isAbort = error instanceof DOMException && error.name === "AbortError";
			updateAssistantMessage(assistantMessageId, {
				content: isAbort
					? "The chat request timed out. Check the server logs to see which RAG step is still running."
					: error instanceof Error
						? error.message
						: "The chat service is unavailable right now.",
				isStreaming: false,
			});
		} finally {
			window.clearTimeout(timeoutId);
			setIsLoading(false);
		}
	}

	return (
		<div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
			{isOpen && (
				<section
					aria-label="Portfolio chatbot"
					className="flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
				>
					<div className="flex items-center justify-between border-b border-border px-4 py-3">
						<div>
							<p className="text-[11px] font-medium uppercase tracking-wide text-muted">Portfolio AI</p>
							<h2 className="text-sm font-semibold">Ask about Rohit</h2>
						</div>
						<button
							type="button"
							aria-label="Close portfolio chat"
							onClick={() => setIsOpen(false)}
							className="text-muted transition-colors hover:text-fg"
						>
							<FiX aria-hidden />
						</button>
					</div>

					<div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
						{SUGGESTIONS.map((suggestion) => (
							<button
								type="button"
								key={suggestion}
								onClick={() => applyQuestion(suggestion)}
								className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:bg-card hover:text-fg"
							>
								<FiArrowUpRight aria-hidden />
								<span>{suggestion}</span>
							</button>
						))}
						{lastQuestion && (
							<button
								type="button"
								onClick={() => applyQuestion(lastQuestion)}
								className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:bg-card hover:text-fg"
							>
								<FiClock aria-hidden />
								<span className="max-w-40 truncate">{lastQuestion}</span>
							</button>
						)}
					</div>

					<div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite" ref={messagesRef}>
						{messages.map((message) => (
							<article
								key={message.id}
								className={
									message.role === "user"
										? "ml-auto max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-sm text-on-accent"
										: "mr-auto max-w-[85%] rounded-2xl bg-card px-3 py-2 text-sm text-fg"
								}
							>
								<div className="prose-sm break-words [&_a]:underline [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4">
									{message.content ? (
										<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
									) : (
										<p className="opacity-70">Starting…</p>
									)}
									{message.isStreaming && (
										<span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle" aria-hidden />
									)}
								</div>
								{message.sources && message.sources.length > 0 && (
									<small className="mt-1 block text-[10px] opacity-70">
										Sources: {message.sources.join(", ")}
									</small>
								)}
							</article>
						))}
					</div>

					<form className="flex items-center gap-2 border-t border-border p-3" onSubmit={submitQuestion}>
						<label className="sr-only" htmlFor="portfolio-chat-question">
							Ask a portfolio question
						</label>
						<input
							id="portfolio-chat-question"
							value={question}
							maxLength={600}
							onChange={(event) => setQuestion(event.target.value)}
							placeholder="Ask about experience, skills, or projects"
							className="flex-1 rounded-full border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
						/>
						<button
							type="button"
							onClick={() => applyQuestion(lastQuestion)}
							disabled={isLoading || !lastQuestion}
							aria-label="Use last question"
							className="rounded-full border border-border p-2 text-muted transition-colors hover:text-fg disabled:opacity-40"
						>
							<FiRefreshCcw aria-hidden />
						</button>
						<button
							type="submit"
							disabled={isLoading || !question.trim()}
							aria-label="Send question"
							className="rounded-full bg-accent p-2 text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							<FiSend aria-hidden />
						</button>
					</form>
				</section>
			)}

			<button
				type="button"
				aria-label="Open portfolio chat"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((currentValue) => !currentValue)}
				className="flex h-14 w-14 items-center justify-center self-end rounded-full bg-accent text-on-accent shadow-lg transition-opacity hover:opacity-90"
			>
				{isOpen ? <FiX size={22} aria-hidden /> : <FiMessageCircle size={22} aria-hidden />}
			</button>
		</div>
	);
}
