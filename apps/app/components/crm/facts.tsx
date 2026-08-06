"use client";

import { Provenance } from "@crm/ui/components/sourced-value";
import { Suggestion } from "@crm/ui/components/suggestion";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type Contact = RouterOutputs["contacts"]["byId"];
export type Fact = Contact["facts"][number];

const dateFormat = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export function factsByField(facts: Fact[]) {
	const applied = new Map<string, Fact>();
	const proposed = new Map<string, Fact>();

	for (const fact of facts) {
		const bucket = fact.status === "APPLIED" ? applied : proposed;
		if (!bucket.has(fact.field)) bucket.set(fact.field, fact);
	}

	return { applied, proposed };
}

export function provenanceFor(fact: Fact) {
	return (
		<Provenance
			claim={fact.value}
			reasons={fact.evidence.map((item) => item.detail)}
			observedAt={dateFormat.format(new Date(fact.observedAt))}
			sourceUrl={fact.sourceUrl}
		/>
	);
}

export function FactSuggestion({
	fact,
	contactId,
}: {
	fact: Fact;
	contactId: string;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();

	const decide = useMutation(
		trpc.contacts.decideFact.mutationOptions({
			onSuccess: (result) => {
				toast.success(
					result.applied
						? "Added to the record."
						: "Dismissed — it won't be suggested again.",
				);
				return cache.contact(contactId, { settle: "record" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Suggestion
			value={fact.value}
			rationale={fact.evidence.map((item) => item.detail).join(" · ")}
			pending={decide.isPending}
			onAccept={() => decide.mutate({ factId: fact.id, decision: "accept" })}
			onDismiss={() => decide.mutate({ factId: fact.id, decision: "dismiss" })}
		/>
	);
}
