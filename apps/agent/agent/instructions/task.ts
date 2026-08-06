import { defineDynamic, defineInstructions } from "eve/instructions";
import { focusOn, setBudget } from "../lib/focus";
import { sessionPreamble } from "../lib/preamble";

export default defineDynamic({
	events: {
		"session.started": async (_event, ctx) => {
			const attributes = ctx.session.auth.current?.attributes ?? {};
			const budget = asNumber(attributes.budget);
			const kind = asString(attributes.taskKind);

			if (budget) setBudget(budget);

			const { markdown, focus } = await sessionPreamble(
				{
					contactId: asString(attributes.contactId),
					companyId: asString(attributes.companyId),
					dealId: asString(attributes.dealId),
				},
				{
					dispatched: Boolean(kind),
					kind,
					reason: asString(attributes.reason),
					budget,
				},
			);

			focusOn({ ...focus, sessionId: ctx.session.id });

			return defineInstructions({ markdown });
		},
	},
});

function asString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
	const parsed = typeof value === "string" ? Number(value) : value;
	return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}
