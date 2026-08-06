"use client";

import { cn } from "@crm/ui/lib/utils";
import type { ReactNode } from "react";
import { type RecordKind, useOpenRecord } from "./record-stack";

export function RecordLink({
	kind,
	id,
	className,
	children,
}: {
	kind: RecordKind;
	id: string;
	className?: string;
	children: ReactNode;
}) {
	const open = useOpenRecord();

	return (
		<button
			type="button"
			onClick={(event) => {
				event.stopPropagation();
				open({ kind, id });
			}}
			className={cn(
				"min-w-0 truncate text-left text-muted-foreground hover:text-foreground hover:underline",
				className,
			)}
		>
			{children}
		</button>
	);
}
