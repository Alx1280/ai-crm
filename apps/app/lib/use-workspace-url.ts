"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { workspaceUrl } from "@/lib/workspace-url";

export function useWorkspaceSlug(): string {
	const { slug } = useParams<{ slug: string }>();

	return slug;
}

export function useWorkspaceUrl(): (path?: string) => string {
	const slug = useWorkspaceSlug();

	return useCallback((path = "/") => workspaceUrl(slug, path), [slug]);
}
