import {
	defaultShouldDehydrateQuery,
	QueryClient,
} from "@tanstack/react-query";

export function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { staleTime: 30_000 },
			dehydrate: {
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
	if (typeof window === "undefined") {
		return makeQueryClient();
	}
	browserQueryClient ??= makeQueryClient();
	return browserQueryClient;
}
