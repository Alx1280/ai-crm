import { z } from "zod";

export const listInput = z.object({
	q: z.string().default(""),
	sort: z.string().default(""),
	dir: z.enum(["asc", "desc"]).default("asc"),
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
});

export type ListInput = z.infer<typeof listInput>;

type FacetCounts = Record<string, Record<string, number>>;

export type ListResult<TRow> = {
	rows: TRow[];
	total: number;
	facetCounts: FacetCounts;
};

export function paginate(input: Pick<ListInput, "page" | "pageSize">): {
	skip: number;
	take: number;
} {
	return {
		skip: (input.page - 1) * input.pageSize,
		take: input.pageSize,
	};
}

export function resolveOrderBy<TOrderBy>(
	input: Pick<ListInput, "sort" | "dir">,
	columns: Record<string, (dir: "asc" | "desc") => TOrderBy>,
	fallback: TOrderBy,
): TOrderBy {
	const column = columns[input.sort];
	return column ? column(input.dir) : fallback;
}

export function countsByKey<
	TKey extends string,
	TGroup extends { _count: { _all: number } } & {
		[K in TKey]?: string | null;
	},
>(groups: TGroup[], key: TKey, nullKey?: string): Record<string, number> {
	const counts: Record<string, number> = {};

	for (const group of groups) {
		const value = group[key] ?? nullKey;
		if (value == null) continue;
		counts[value] = (counts[value] ?? 0) + group._count._all;
	}

	return counts;
}

export const FACET_ALL = "all";

export const FACET_UNASSIGNED = "unassigned";

export function ownerFilter(
	value: string,
): { ownerId: string | null } | undefined {
	if (value === FACET_ALL) return undefined;
	return { ownerId: value === FACET_UNASSIGNED ? null : value };
}
