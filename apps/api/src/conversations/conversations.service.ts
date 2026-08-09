import type { Db } from "@crm/db";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import type { Cache } from "cache-manager";
import { InjectDatabase } from "../database/database.constants";
import type {
	ConversationEventsInput,
	ConversationListInput,
	ConversationSaveInput,
} from "./conversations.contracts";

export interface ConversationSummary {
	id: string;
	sessionId: string;
	continuationToken: string | null;
	streamIndex: number;
	title: string | null;
	messageCount: number;
	lastMessageAt: string;
}

const LIST_TTL_MS = 10 * 60_000;

const listKey = (userId: string, recordId: string) =>
	`agent:conversations:${userId}:${recordId}`;

@Injectable()
export class ConversationsService {
	private readonly logger = new Logger(ConversationsService.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		@Inject(CACHE_MANAGER) private readonly cache: Cache,
	) {}

	async list(
		input: ConversationListInput,
		userId: string,
	): Promise<ConversationSummary[]> {
		const recordId = this.recordId(input);
		const key = listKey(userId, recordId);

		const cached = await this.cache.get<ConversationSummary[]>(key);
		if (cached) return cached;

		this.logger.debug({ message: "Conversation list cache miss", recordId });

		const rows = await this.db.agentConversation.findMany({
			where: {
				userId,
				...(input.contactId ? { contactId: input.contactId } : {}),
				...(input.companyId ? { companyId: input.companyId } : {}),
				...(input.dealId ? { dealId: input.dealId } : {}),
			},
			orderBy: { lastMessageAt: "desc" },
			take: 20,
			select: {
				id: true,
				sessionId: true,
				continuationToken: true,
				streamIndex: true,
				title: true,
				messageCount: true,
				lastMessageAt: true,
			},
		});

		const summaries = rows.map((row) => ({
			...row,
			lastMessageAt: row.lastMessageAt.toISOString(),
		}));

		await this.cache.set(key, summaries, LIST_TTL_MS);

		return summaries;
	}

	async save(
		input: ConversationSaveInput,
		userId: string,
	): Promise<{ id: string }> {
		const recordId = this.recordId(input);

		const conversation = await this.db.agentConversation.upsert({
			where: { sessionId: input.sessionId },
			create: {
				sessionId: input.sessionId,
				continuationToken: input.continuationToken ?? null,
				streamIndex: input.streamIndex ?? 0,
				title: input.title?.slice(0, 120) ?? null,
				messageCount: input.messageCount ?? 0,
				userId,
				contactId: input.contactId ?? null,
				companyId: input.companyId ?? null,
				dealId: input.dealId ?? null,
			},
			update: {
				continuationToken: input.continuationToken ?? null,
				streamIndex: input.streamIndex ?? 0,
				messageCount: input.messageCount ?? 0,
				lastMessageAt: new Date(),
			},
			select: { id: true, userId: true },
		});

		if (conversation.userId !== userId) {
			throw new BadRequestException(
				"That conversation belongs to someone else.",
			);
		}

		await this.cache.del(listKey(userId, recordId));

		return { id: conversation.id };
	}

	async events(input: ConversationEventsInput, userId: string) {
		const conversation = await this.db.agentConversation.findUnique({
			where: { id: input.id },
			select: { sessionId: true, userId: true },
		});

		if (!conversation || conversation.userId !== userId) {
			throw new NotFoundException(`No conversation with id ${input.id}.`);
		}

		const events = await this.db.agentEvent.findMany({
			where: { sessionId: conversation.sessionId },
			orderBy: { emittedAt: "asc" },
			take: input.limit,
			select: { id: true, type: true, data: true, emittedAt: true },
		});

		return events.map((event) => ({
			type: event.type,
			data: event.data,
			meta: { id: event.id, at: event.emittedAt.toISOString() },
		}));
	}

	async remove(id: string, userId: string): Promise<{ id: string }> {
		const conversation = await this.db.agentConversation.findUnique({
			where: { id },
			select: {
				id: true,
				userId: true,
				contactId: true,
				companyId: true,
				dealId: true,
				sessionId: true,
			},
		});

		if (!conversation || conversation.userId !== userId) {
			throw new NotFoundException(`No conversation with id ${id}.`);
		}

		await this.db.$transaction([
			this.db.agentEvent.deleteMany({
				where: { sessionId: conversation.sessionId },
			}),
			this.db.agentConversation.delete({ where: { id } }),
		]);

		await this.cache.del(
			listKey(
				userId,
				conversation.contactId ??
					conversation.companyId ??
					conversation.dealId ??
					"",
			),
		);

		this.logger.log({ message: "Conversation removed", conversationId: id });

		return { id };
	}

	private recordId(input: {
		contactId?: string;
		companyId?: string;
		dealId?: string;
	}): string {
		const recordId = input.contactId ?? input.companyId ?? input.dealId;

		if (!recordId) {
			throw new BadRequestException(
				"A conversation belongs to a contact, a company or a deal.",
			);
		}

		return recordId;
	}
}
