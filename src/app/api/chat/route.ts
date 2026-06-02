import { type NextRequest, NextResponse } from "next/server";
import {
	answerPortfolioQuestion,
	type PortfolioChatHistoryMessage,
	streamPortfolioQuestion,
} from "@/lib/portfolio-rag";

export const runtime = "nodejs";

function shouldLogChat() {
	return process.env.NODE_ENV !== "production" || process.env.RAG_DEBUG === "true";
}

function logChat(requestId: string, message: string, details?: Record<string, unknown>) {
	if (!shouldLogChat()) {
		return;
	}

	console.log(`[portfolio-chat:${requestId}] ${message}`, details || "");
}

function elapsed(startedAt: number) {
	return `${Math.round(performance.now() - startedAt)}ms`;
}

function normalizeHistory(history: unknown): PortfolioChatHistoryMessage[] {
	if (!Array.isArray(history)) {
		return [];
	}

	return history
		.filter((message): message is { role: unknown; content: unknown } => Boolean(message))
		.map((message): PortfolioChatHistoryMessage => {
			const role: PortfolioChatHistoryMessage["role"] = message.role === "assistant" ? "assistant" : "user";

			return {
				role,
				content: String(message.content || "")
					.replace(/\s+/g, " ")
					.trim()
					.slice(0, 2000),
			};
		})
		.filter((message) => message.content)
		.slice(-15);
}

export async function POST(request: NextRequest) {
	const requestId = crypto.randomUUID().slice(0, 8);
	const startedAt = performance.now();

	try {
		logChat(requestId, "request received");
		const body = (await request.json()) as { history?: unknown; question?: unknown; stream?: unknown };
		const question = String(body.question || "").trim();
		const shouldStream = body.stream === true;
		const history = normalizeHistory(body.history);
		logChat(requestId, "request parsed", {
			questionLength: question.length,
			provider: process.env.RAG_PROVIDER || "openai",
			stream: shouldStream,
			historyCount: history.length,
		});

		if (!question) {
			logChat(requestId, "request rejected: empty question", {
				elapsed: elapsed(startedAt),
			});
			return NextResponse.json({ error: "Please provide a question." }, { status: 400 });
		}

		if (question.length > 600) {
			logChat(requestId, "request rejected: question too long", {
				elapsed: elapsed(startedAt),
			});
			return NextResponse.json({ error: "Please keep questions under 600 characters." }, { status: 400 });
		}

		if (shouldStream) {
			const result = await streamPortfolioQuestion(question, requestId, history);
			const encoder = new TextEncoder();

			const stream = new ReadableStream({
				async start(controller) {
					try {
						for await (const chunk of result.stream) {
							controller.enqueue(encoder.encode(chunk));
						}

						controller.enqueue(encoder.encode(`\n\n<!-- sources:${JSON.stringify(result.sources)} -->`));
						controller.close();
						logChat(requestId, "stream completed", {
							sources: result.sources,
							elapsed: elapsed(startedAt),
						});
					} catch (error) {
						const message = error instanceof Error ? error.message : "Stream failed.";
						controller.enqueue(encoder.encode(`\n\n**Error:** ${message}`));
						controller.close();
						logChat(requestId, "stream failed", {
							error: message,
							elapsed: elapsed(startedAt),
						});
					}
				},
			});

			return new Response(stream, {
				headers: {
					"Cache-Control": "no-cache, no-transform",
					"Content-Type": "text/markdown; charset=utf-8",
					"X-Portfolio-Chat-Request-Id": requestId,
				},
			});
		}

		const result = await answerPortfolioQuestion(question, requestId, history);
		logChat(requestId, "request completed", {
			sources: result.sources,
			elapsed: elapsed(startedAt),
		});

		return NextResponse.json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unable to answer right now.";
		const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
		logChat(requestId, "request failed", {
			status,
			error: message,
			elapsed: elapsed(startedAt),
		});

		return NextResponse.json({ error: message }, { status });
	}
}
