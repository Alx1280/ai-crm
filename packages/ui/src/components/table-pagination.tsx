"use client";

import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import { Button } from "@crm/ui/components/button";
import { Spinner } from "@crm/ui/components/spinner";
import type { ReactNode } from "react";

const numberFormat = new Intl.NumberFormat();

export function TablePagination({
	page,
	totalPages,
	pageSize,
	total,
	onPageChange,
	loading = false,
	meta,
}: {
	page: number;
	totalPages: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	loading?: boolean;
	meta?: ReactNode;
}) {
	const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const rangeEnd = Math.min(page * pageSize, total);

	return (
		<div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
			<span className="flex items-center gap-2 text-muted-foreground text-xs tabular-nums">
				{loading && <Spinner />}
				{meta ??
					(total === 0
						? "No results"
						: `Showing ${numberFormat.format(rangeStart)}–${numberFormat.format(
								rangeEnd,
							)} of ${numberFormat.format(total)}`)}
			</span>
			{totalPages > 1 && (
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						disabled={page <= 1}
						onClick={() => onPageChange(Math.max(1, page - 1))}
					>
						<ChevronLeft data-icon="inline-start" />
						Previous
					</Button>
					<span className="text-muted-foreground text-xs tabular-nums">
						{page} / {totalPages}
					</span>
					<Button
						variant="contrast"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => onPageChange(page + 1)}
					>
						Next
						<ChevronRight data-icon="inline-end" />
					</Button>
				</div>
			)}
		</div>
	);
}
