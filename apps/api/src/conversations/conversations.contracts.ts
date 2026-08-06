import { z } from "zod";

export const conversationListInput = z.object({
	contactId: z.string().optional(),
	companyId: z.string().optional(),
	dealId: z.string().optional(),
});

export type ConversationListInput = z.infer<typeof conversationListInput>;

export const conversationSaveInput = z.object({
	contactId: z.string().optional(),
	companyId: z.string().optional(),
	dealId: z.string().optional(),
	sessionId: z.string(),
	continuationToken: z.string().nullish(),
	streamIndex: z.number().int().min(0).optional(),
	title: z.string().optional(),
	messageCount: z.number().int().min(0).optional(),
});

export type ConversationSaveInput = z.infer<typeof conversationSaveInput>;

export const conversationIdInput = z.object({ id: z.string() });

export const conversationEventsInput = z.object({
	id: z.string(),
	limit: z.number().int().min(1).max(5000).default(2000),
});

export type ConversationEventsInput = z.infer<typeof conversationEventsInput>;
