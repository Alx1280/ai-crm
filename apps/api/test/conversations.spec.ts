import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { ConversationsService } from "../src/conversations/conversations.service";

const suffix = process.env.TEST_RUN_ID ?? "conversations-spec";
const email = `conversation.subject.${suffix}@example.test`;
const userId = `user-${suffix}`;

function memoryCache() {
	const store = new Map<string, unknown>();
	return {
		store,
		get: async <T>(key: string) => store.get(key) as T | undefined,
		set: async (key: string, value: unknown) => {
			store.set(key, value);
		},
		del: async (key: string) => {
			store.delete(key);
		},
	};
}

let contactId: string;
let service: ConversationsService;
let cache: ReturnType<typeof memoryCache>;

beforeAll(async () => {
	await db.user.deleteMany({ where: { id: userId } });
	await db.contact.deleteMany({ where: { email } });

	await db.user.create({
		data: { id: userId, name: "Test Rep", email: `${userId}@example.test` },
	});
	const contact = await db.contact.create({
		data: { firstName: "Conversation", lastName: "Subject", email },
		select: { id: true },
	});
	contactId = contact.id;

	cache = memoryCache();
	service = new ConversationsService(
		db,
		cache as unknown as ConstructorParameters<typeof ConversationsService>[1],
	);
});

afterAll(async () => {
	await db.contact.deleteMany({ where: { email } });
	await db.user.deleteMany({ where: { id: userId } });
});

describe("ConversationsService", () => {
	it("starts a record with no history", async () => {
		expect(await service.list({ contactId }, userId)).toEqual([]);
	});

	it("saves a cursor and titles the thread from the opening question", async () => {
		await service.save(
			{
				contactId,
				sessionId: `ses_${suffix}_1`,
				continuationToken: "eve:token-1",
				streamIndex: 4,
				title: "Are they still there?",
				messageCount: 2,
			},
			userId,
		);

		const [conversation] = await service.list({ contactId }, userId);

		expect(conversation).toMatchObject({
			sessionId: `ses_${suffix}_1`,
			continuationToken: "eve:token-1",
			streamIndex: 4,
			title: "Are they still there?",
			messageCount: 2,
		});
	});

	it("moves the cursor without renaming the thread", async () => {
		await service.save(
			{
				contactId,
				sessionId: `ses_${suffix}_1`,
				continuationToken: "eve:token-2",
				streamIndex: 9,
				messageCount: 4,
			},
			userId,
		);

		const [conversation] = await service.list({ contactId }, userId);

		expect(conversation).toMatchObject({
			continuationToken: "eve:token-2",
			streamIndex: 9,
			title: "Are they still there?",
			messageCount: 4,
		});
	});

	it("serves the list from cache, and drops it when something changes", async () => {
		await service.list({ contactId }, userId);
		expect(cache.store.size).toBe(1);

		await service.save(
			{ contactId, sessionId: `ses_${suffix}_2`, messageCount: 1 },
			userId,
		);
		expect(cache.store.size).toBe(0);

		expect(await service.list({ contactId }, userId)).toHaveLength(2);
	});

	it("newest first, so reopening lands on the last thing you asked", async () => {
		const [first] = await service.list({ contactId }, userId);
		expect(first?.sessionId).toBe(`ses_${suffix}_2`);
	});

	it("keeps one rep's conversations out of another's", async () => {
		expect(await service.list({ contactId }, "somebody-else")).toEqual([]);
	});

	it("refuses a conversation that belongs to a record of neither kind", async () => {
		expect(
			service.save({ sessionId: `ses_${suffix}_3` }, userId),
		).rejects.toThrow();
	});

	it("forgets a conversation and the events behind it", async () => {
		const [conversation] = await service.list({ contactId }, userId);
		if (!conversation) throw new Error("expected a conversation");

		await db.agentEvent.create({
			data: {
				id: `evt_${suffix}`,
				sessionId: conversation.sessionId,
				contactId,
				type: "turn.completed",
				data: {},
				emittedAt: new Date(),
			},
		});

		await service.remove(conversation.id, userId);

		expect(await service.list({ contactId }, userId)).toHaveLength(1);
		expect(
			await db.agentEvent.count({
				where: { sessionId: conversation.sessionId },
			}),
		).toBe(0);
	});

	it("will not let one rep delete another's conversation", async () => {
		const [conversation] = await service.list({ contactId }, userId);
		if (!conversation) throw new Error("expected a conversation");

		expect(service.remove(conversation.id, "somebody-else")).rejects.toThrow();
	});
});
