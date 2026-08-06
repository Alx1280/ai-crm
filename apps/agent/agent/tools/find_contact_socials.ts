import { defineTool } from "eve/tools";
import { z } from "zod";
import { personForVerification, stampSocialsChecked } from "../lib/crm";
import { focusOn, spend } from "../lib/focus";
import { findSocialCandidates } from "../lib/socials";

export default defineTool({
	description:
		"Search the web for a contact's X and GitHub profiles. Returns CANDIDATES ONLY — pass them to set_contact_socials, which re-checks each one against the account itself before writing. Never write these URLs any other way.",
	inputSchema: z.object({
		contactId: z.string(),
	}),
	async execute({ contactId }) {
		focusOn({ contactId });

		const person = await personForVerification(contactId);
		if (!person) {
			return { searched: false as const, reason: "No such contact." };
		}

		const charge = spend(2);
		if (!charge.ok) return { searched: false as const, reason: charge.reason };

		const [x, github] = await Promise.all([
			findSocialCandidates(person, "x"),
			findSocialCandidates(person, "github"),
		]);

		await stampSocialsChecked(contactId);

		return {
			searched: true as const,
			searchedFor: person.fullName,
			candidates: {
				x: x.candidates.map((c) => c.url),
				github: github.candidates.map((c) => c.url),
			},
			citations: [...x.citations, ...github.citations],
			note: "Unverified. set_contact_socials will reject any of these it cannot corroborate, and that is a normal outcome.",
		};
	},
});
