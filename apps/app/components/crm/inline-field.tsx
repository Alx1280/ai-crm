"use client";

import { Button } from "@crm/ui/components/button";
import { DatePicker } from "@crm/ui/components/date-picker";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { SOURCED_VALUE, SourcedValue } from "@crm/ui/components/sourced-value";
import { Spinner } from "@crm/ui/components/spinner";
import { cn } from "@crm/ui/lib/utils";
import { useId, useState } from "react";
import { PROPERTY_LABEL, PROPERTY_ROW } from "@/components/detail-sheet";

const ROW = cn(PROPERTY_ROW, "items-center");
const LABEL = PROPERTY_LABEL;
const CONTROL =
	"h-8 w-full justify-start px-2 font-normal hover:border-input hover:bg-muted/40 border border-transparent";

export function savingField(update: {
	isPending: boolean;
	variables?: { data?: object } | undefined;
}): (field: string) => boolean {
	const fields = update.isPending
		? Object.keys(update.variables?.data ?? {})
		: [];
	return (field) => fields.includes(field);
}

export function InlineField({
	label,
	value,
	onSave,
	saving = false,
	placeholder,
	type = "text",
	render,
	provenance,
	suggestion,
}: {
	label: string;
	value: string | null;
	onSave: (next: string) => void;
	saving?: boolean;
	placeholder?: string;
	type?: "text" | "url" | "email" | "tel";
	render?: (value: string) => React.ReactNode;
	provenance?: React.ReactNode;
	suggestion?: React.ReactNode;
}) {
	const id = useId();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value ?? "");

	const commit = () => {
		setEditing(false);
		if (draft.trim() !== (value ?? "")) onSave(draft.trim());
	};

	const shown = saving ? draft.trim() : (value ?? "");

	const sourced = Boolean(provenance) && !editing && shown !== "";

	const control = editing ? (
		<Input
			id={id}
			type={type}
			autoFocus
			value={draft}
			placeholder={placeholder}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					commit();
				}
				if (event.key === "Escape") {
					setDraft(value ?? "");
					setEditing(false);
				}
			}}
		/>
	) : (
		<Button
			variant="ghost"
			size="sm"
			className={CONTROL}
			onClick={() => {
				setDraft(value ?? "");
				setEditing(true);
			}}
		>
			{saving ? <Spinner /> : null}
			{shown ? (
				<span className={cn("truncate", sourced && SOURCED_VALUE)}>
					{render ? render(shown) : shown}
				</span>
			) : (
				<span className="truncate text-muted-foreground">
					{placeholder ?? <EmptyCellValue />}
				</span>
			)}
		</Button>
	);

	const body =
		sourced && provenance ? (
			<SourcedValue source={provenance}>{control}</SourcedValue>
		) : (
			control
		);

	if (!suggestion) {
		return (
			<div className={ROW}>
				<label htmlFor={id} className={LABEL}>
					{label}
				</label>
				{body}
			</div>
		);
	}

	return (
		<div className={cn(ROW, "items-start")}>
			<label htmlFor={id} className={cn(LABEL, "pt-2")}>
				{label}
			</label>
			<div className="min-w-0">
				{body}
				{suggestion}
			</div>
		</div>
	);
}

export function InlineDateField({
	label,
	value,
	onSave,
	saving = false,
	placeholder = "—",
}: {
	label: string;
	value: string | null;
	onSave: (next: string) => void;
	saving?: boolean;
	placeholder?: string;
}) {
	const id = useId();

	return (
		<div className={ROW}>
			<label htmlFor={id} className={LABEL}>
				{label}
			</label>
			<div className="flex min-w-0 items-center gap-1.5">
				<DatePicker
					id={id}
					variant="ghost"
					value={value?.slice(0, 10) ?? null}
					placeholder={placeholder}
					onChange={onSave}
				/>
				{saving ? <Spinner /> : null}
			</div>
		</div>
	);
}

export function InlineSelectField({
	label,
	value,
	options,
	onSave,
	placeholder = "None",
}: {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onSave: (next: string) => void;
	placeholder?: string;
}) {
	const id = useId();

	return (
		<div className={ROW}>
			<label htmlFor={id} className={LABEL}>
				{label}
			</label>
			<Select value={value} onValueChange={onSave}>
				<SelectTrigger id={id} variant="ghost" className="w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
