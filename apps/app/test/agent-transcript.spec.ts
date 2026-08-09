import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import type { EveMessage } from "eve/react";
import {
	describe as describeStep,
	NEW_THREAD,
	outcomeTone,
	pendingQuestion,
	resolveThread,
	sourcesOf,
	TOOL_VERBS,
	toTranscript,
} from "../lib/agent-transcript";

const message = (parts: unknown[], role: "user" | "assistant" = "assistant") =>
	({ id: "m1", role, parts }) as unknown as EveMessage;

const tool = (
	toolName: string,
	extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
	type: "dynamic-tool",
	toolName,
	state: "output-available",
	...extra,
});

describe("toTranscript", () => {
	it("keeps a rep's question as the words they typed", () => {
		const [first] = toTranscript([
			message([{ type: "text", text: "Hey!" }], "user"),
		]);

		expect(first?.mine).toBe(true);
		expect(first?.items[0]).toMatchObject({ kind: "said", text: "Hey!" });
	});

	it("keeps one message's parts in one row", () => {
		const grouped = toTranscript([
			message([
				{ type: "text", text: "Looking now." },
				tool("read_crm_history", { output: {} }),
			]),
		]);

		expect(grouped).toHaveLength(1);
		expect(grouped[0]?.items.map((item) => item.kind)).toEqual(["said", "did"]);
	});

	it("gives a tool call the same id across its streaming states", () => {
		const streaming = toTranscript([
			message([
				tool("get_linkedin_profile", {
					state: "input-available",
					toolCallId: "call_1",
				}),
			]),
		]);
		const settled = toTranscript([
			message([
				{ type: "text", text: "Checking." },
				tool("get_linkedin_profile", {
					state: "output-available",
					toolCallId: "call_1",
					output: { found: true },
				}),
			]),
		]);

		const before = streaming[0]?.items[0]?.id;
		const after = settled[0]?.items.find((item) => item.kind === "did")?.id;

		expect(after).toBe(before as string);
	});

	it("drops a message whose only text was empty", () => {
		expect(toTranscript([message([{ type: "text", text: "   " }])])).toEqual(
			[],
		);
	});

	it("marks a tool that has not returned as pending", () => {
		const grouped = toTranscript([
			message([tool("get_linkedin_profile", { state: "input-available" })]),
		]);

		expect(grouped[0]?.items[0]).toMatchObject({ kind: "did", pending: true });
	});
});

describe("describe", () => {
	it("says what happened in a rep's words, not the tool's", () => {
		expect(describeStep(tool("read_crm_history") as never)).toBe(
			"Read our emails and meetings with them",
		);
	});

	it("carries the reason a write did not happen", () => {
		const step = tool("set_contact_socials", {
			output: { written: false, reason: "the account is named somebody else" },
		});

		expect(describeStep(step as never)).toContain("named somebody else");
	});

	it("falls back to a readable form of an unknown tool", () => {
		expect(describeStep(tool("some_new_tool") as never)).toBe("Some new tool");
	});
});

describe("outcomeTone", () => {
	it("reads a write as success", () => {
		expect(
			outcomeTone(tool("record_fact", { output: { applied: true } }) as never),
		).toBe("success");
	});

	it("reads a refusal as a warning, because that is the interesting half", () => {
		expect(
			outcomeTone(tool("record_fact", { output: { stored: false } }) as never),
		).toBe("warning");
		expect(
			outcomeTone(tool("write_brief", { output: { written: false } }) as never),
		).toBe("warning");
	});

	it("reads a failed call as a warning", () => {
		expect(
			outcomeTone(tool("research_person", { state: "output-error" }) as never),
		).toBe("warning");
	});

	it("leaves a plain read neutral", () => {
		expect(
			outcomeTone(
				tool("read_crm_history", { output: { found: true } }) as never,
			),
		).toBe("neutral");
	});
});

describe("sourcesOf", () => {
	it("offers the page behind a step, labelled by host", () => {
		const sources = sourcesOf(
			tool("get_linkedin_profile", {
				output: { sourceUrl: "https://www.linkedin.com/in/someone" },
			}) as never,
		);

		expect(sources).toEqual([
			{
				url: "https://www.linkedin.com/in/someone",
				title: "linkedin.com",
				network: "linkedin",
			},
		]);
	});

	it("does not offer the same page twice", () => {
		const sources = sourcesOf(
			tool("set_contact_socials", {
				output: {
					url: "https://github.com/someone",
					sourceUrl: "https://github.com/someone",
				},
			}) as never,
		);

		expect(sources).toHaveLength(1);
		expect(sources[0]?.network).toBe("github");
	});

	it("ignores anything that is not a link", () => {
		const sources = sourcesOf(
			tool("record_fact", {
				output: { sourceUrl: "not-a-url", url: 42 },
			}) as never,
		);

		expect(sources).toEqual([]);
	});
});

describe("pendingQuestion", () => {
	const request = {
		requestId: "req_1",
		prompt: "Which one?",
		options: [{ id: "a", label: "The first" }],
	};

	it("finds a question the agent is parked on", () => {
		const found = pendingQuestion([
			message([
				{
					type: "dynamic-tool",
					toolName: "ask_question",
					toolMetadata: { eve: { inputRequest: request } },
				},
			]),
		]);

		expect(found?.requestId).toBe("req_1");
	});

	it("ignores a question from an earlier message that has moved on", () => {
		const asked = message([
			{
				type: "dynamic-tool",
				toolName: "ask_question",
				toolMetadata: { eve: { inputRequest: request } },
			},
		]);
		const answered = message([{ type: "text", text: "Thanks." }]);

		expect(pendingQuestion([asked, answered])).toBeNull();
	});

	it("finds nothing in an empty transcript", () => {
		expect(pendingQuestion([])).toBeNull();
	});
});

describe("resolveThread", () => {
	const rows = [
		{ id: "c2", title: "Thursday" },
		{ id: "c1", title: "Monday" },
	];

	it("lands on the most recent conversation when the URL says nothing", () => {
		const { current } = resolveThread({
			conversations: rows,
			fromUrl: null,
			landedOn: "c2",
		});

		expect(current?.title).toBe("Thursday");
	});

	it("opens the thread named in the URL, so a link is a conversation", () => {
		const { current } = resolveThread({
			conversations: rows,
			fromUrl: "c1",
			landedOn: "c2",
		});

		expect(current?.title).toBe("Monday");
	});

	it("shows nothing for a deliberately new thread", () => {
		const { openId, current } = resolveThread({
			conversations: rows,
			fromUrl: NEW_THREAD,
			landedOn: "c2",
		});

		expect(openId).toBe(NEW_THREAD);
		expect(current).toBeNull();
	});

	it("does not move the open thread when the list grows underneath it", () => {
		const before = resolveThread({
			conversations: rows,
			fromUrl: null,
			landedOn: "c2",
		});
		const after = resolveThread({
			conversations: [{ id: "c3", title: "Just now" }, ...rows],
			fromUrl: null,
			landedOn: "c2",
		});

		expect(after.openId).toBe(before.openId);
		expect(after.current?.title).toBe("Thursday");
	});

	it("holds its place while the list is still loading", () => {
		const { openId, current } = resolveThread({
			conversations: [],
			fromUrl: null,
			landedOn: null,
		});

		expect(openId).toBeNull();
		expect(current).toBeNull();
	});

	it("survives a thread that has been deleted from under it", () => {
		const { openId, current } = resolveThread({
			conversations: rows,
			fromUrl: "gone",
			landedOn: "c2",
		});

		expect(openId).toBe("gone");
		expect(current).toBeNull();
	});
});

describe("every tool has a line of English", () => {
	const BUILT_INS = [
		"load_skill",
		"web_search",
		"web_fetch",
		"todo",
		"ask_question",
		"agent",
		"connection_search",
		"bash",
		"read_file",
		"write_file",
		"glob",
		"grep",
	];

	const authored = readdirSync(
		new URL("../../agent/agent/tools", import.meta.url),
	)
		.filter((file) => file.endsWith(".ts"))
		.map((file) => file.replace(/\.ts$/, ""));

	it("covers every tool the agent ships with", () => {
		expect(authored.length).toBeGreaterThan(0);

		for (const tool of [...authored, ...BUILT_INS]) {
			expect(TOOL_VERBS[tool]).toBeString();
		}
	});

	it("writes them as sentences, not as slugs", () => {
		for (const [tool, verb] of Object.entries(TOOL_VERBS)) {
			expect(verb, tool).not.toContain("_");
			expect(verb[0], tool).toBe(verb[0]?.toUpperCase() ?? "");
		}
	});
});
