import { cn } from "@crm/ui/lib/utils";
import type * as React from "react";

/**
 * The inline pill an agent instruction is written out of — a mention, a stage,
 * a schedule. Used in the composer line and in every suggested action beneath
 * it, so the two always read as the same sentence grammar.
 */
export function Chip({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center gap-[5px] rounded-full bg-card px-1.5 font-medium text-[13px]/[22px] tracking-[-0.225px]",
				className,
			)}
		>
			{children}
		</span>
	);
}
