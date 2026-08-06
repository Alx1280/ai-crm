import { z } from "zod";
import { listInput } from "../trpc/list-input";

export const contactListInput = listInput.extend({
	owner: z.string().default("all"),
	company: z.string().default("all"),
	source: z.string().default("all"),
});

export type ContactListInput = z.infer<typeof contactListInput>;

export const contactCreateInput = z.object({
	firstName: z.string().trim().min(1, "A contact needs a first name."),
	lastName: z.string().trim().optional(),
	email: z.email("That is not an email address.").optional().or(z.literal("")),
	phone: z.string().trim().optional(),
	title: z.string().trim().optional(),
	companyId: z.string().nullable().optional(),
	ownerId: z.string().nullable().optional(),
});

export type ContactCreateInput = z.infer<typeof contactCreateInput>;

const contactUpdateInput = z.object({
	firstName: z.string().trim().min(1).optional(),
	lastName: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	title: z.string().optional(),
	linkedinUrl: z.string().optional(),
	twitterUrl: z.string().optional(),
	githubUrl: z.string().optional(),
	companyId: z.string().nullable().optional(),
	ownerId: z.string().nullable().optional(),
});

export type ContactUpdateInput = z.infer<typeof contactUpdateInput>;

export const contactUpdateArgs = z.object({
	id: z.string(),
	data: contactUpdateInput,
});

export const contactIdInput = z.object({ id: z.string() });

export const factDecisionInput = z.object({
	factId: z.string(),
	decision: z.enum(["accept", "dismiss"]),
});

export type FactDecisionInput = z.infer<typeof factDecisionInput>;
