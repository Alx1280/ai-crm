import { defineTool } from "eve/tools";
import { z } from "zod";
import { contactsNeedingWork } from "../lib/crm";

export default defineTool({
	description:
		"List CRM contacts with outstanding research: no real name yet, no background written, or socials never looked for. Each row says what is missing. Deciding what is worth doing, and in what order, is your job.",
	inputSchema: z.object({
		limit: z.number().int().min(1).max(25).default(10),
	}),
	async execute({ limit }) {
		const contacts = await contactsNeedingWork(limit);
		return { count: contacts.length, contacts };
	},
});
