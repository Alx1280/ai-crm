"use client";

import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import { Spinner } from "@crm/ui/components/spinner";
import { formatMoney } from "@crm/ui/lib/format";
import type { ReactNode } from "react";
import {
	DetailSheetHeader,
	type DetailSheetTab,
	DetailSheetTabs,
} from "@/components/detail-sheet";
import { useRecordStack } from "./record-stack";

export function RecordSheetFrame({
	loading,
	error,
	title,
	description,
	note,
	media,
	actions,
	stats,
	tabs,
	tab,
	onTabChange,
}: {
	loading: boolean;
	error: string | null;
	title: string;
	description?: ReactNode;
	note?: ReactNode;
	media?: ReactNode;
	actions?: ReactNode;
	stats?: ReactNode;
	tabs: DetailSheetTab[];
	tab: string;
	onTabChange: (tab: string) => void;
}) {
	const { stack, close, closeAll } = useRecordStack();

	return (
		<>
			<DetailSheetHeader
				media={media}
				title={title}
				description={description}
				note={note}
				actions={actions}
				onBack={stack.length > 1 ? close : undefined}
				onClose={closeAll}
			/>

			{loading ? (
				<div className="flex min-h-0 flex-1 items-center justify-center">
					<Spinner />
				</div>
			) : error ? (
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
					<p className="font-medium text-sm">This record could not be loaded</p>
					<p className="text-muted-foreground text-xs">{error}</p>
				</div>
			) : (
				<>
					{stats}
					<DetailSheetTabs
						tabs={tabs}
						value={tab}
						onValueChange={onTabChange}
					/>
				</>
			)}
		</>
	);
}

export function DealAmount({
	amountCents,
	currency,
}: {
	amountCents: number | null;
	currency: string;
}) {
	if (amountCents === null) return <EmptyCellValue />;
	return (
		<span className="tabular-nums">{formatMoney(amountCents, currency)}</span>
	);
}

export function MetaLine({
	lead,
	parts,
}: {
	lead?: ReactNode;
	parts: (string | null | undefined)[];
}) {
	const seen = new Set<string>();
	const rest: string[] = [];

	for (const part of parts) {
		const value = part?.trim();
		if (!value) continue;

		const key = value.toLowerCase();
		if (seen.has(key)) continue;

		seen.add(key);
		rest.push(value);
	}

	return (
		<>
			{lead}
			{rest.map((part, index) => (
				<span key={part}>
					{index === 0 && !lead ? null : " · "}
					{part}
				</span>
			))}
		</>
	);
}

export function DomainLink({
	domain,
	website,
}: {
	domain: string | null;
	website: string | null;
}) {
	const href = website ?? (domain ? `https://${domain}` : null);
	const label = domain ?? website;
	if (!href || !label) return null;

	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer noopener"
			onClick={(event) => event.stopPropagation()}
			className="text-foreground underline-offset-2 hover:underline"
		>
			{label}
		</a>
	);
}
