"use client";

import { useQueryState } from "nuqs";
import { PageShellDescription, PageShellTitle } from "@/components/page-shell";
import { overviewParsers } from "./overview-search-params";

export function OverviewGreetingFallback() {
	return (
		<>
			<PageShellTitle>Welcome back</PageShellTitle>
			<PageShellDescription>
				What you have closed, what is still in play, and what needs you today.
			</PageShellDescription>
		</>
	);
}

export function OverviewGreeting() {
	const [scope] = useQueryState("scope", overviewParsers.scope);

	return (
		<>
			<PageShellTitle>Welcome back</PageShellTitle>
			<PageShellDescription>
				{scope === "me"
					? "What you have closed, what is still in play, and what needs you today."
					: "What the team has closed, what is still in play, and what needs you today."}
			</PageShellDescription>
		</>
	);
}
