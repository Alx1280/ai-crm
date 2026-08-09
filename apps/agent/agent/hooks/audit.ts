import { db } from "@crm/db";
import { defineHook } from "eve/hooks";
import { currentFocus } from "../lib/focus";

export default defineHook({
	events: {
		async "*"(event, ctx) {
			const id = event.meta?.id;

			if (!id) return;

			try {
				await db.agentEvent.createMany({
					data: [
						{
							id,
							sessionId: ctx.session.id,
							contactId: currentFocus().contactId,
							type: event.type,
							data: ("data" in event ? (event.data ?? {}) : {}) as object,
							emittedAt: event.meta?.at ? new Date(event.meta.at) : new Date(),
						},
					],
					skipDuplicates: true,
				});
			} catch (error) {
				console.warn("[audit] could not record event", {
					type: event.type,
					reason: error instanceof Error ? error.message : String(error),
				});
			}
		},
	},
});
