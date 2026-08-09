import "server-only";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getServerQueryClient } from "./server";

export function HydrateClient({ children }: { children: ReactNode }) {
	return (
		<HydrationBoundary state={dehydrate(getServerQueryClient())}>
			{children}
		</HydrationBoundary>
	);
}
