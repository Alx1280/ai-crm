import { createLoader, parseAsStringLiteral } from "nuqs/server";

export const OVERVIEW_SCOPES = ["me", "everyone"] as const;

export type OverviewScope = (typeof OVERVIEW_SCOPES)[number];

export const overviewParsers = {
	scope: parseAsStringLiteral(OVERVIEW_SCOPES).withDefault("me"),
};

export const loadOverviewSearchParams = createLoader(overviewParsers);
