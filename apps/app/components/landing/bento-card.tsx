import { cn } from "@crm/ui/lib/utils";
import type * as React from "react";

export function BentoCard({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex flex-col overflow-clip rounded-lg bg-card p-7",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function CardHeading({ title, body }: { title: string; body: string }) {
	return (
		<div className="flex flex-col gap-2">
			<CardTitle>{title}</CardTitle>
			<CardBody>{body}</CardBody>
		</div>
	);
}

export function CardTitle({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="text-balance font-medium text-[19px]/[26px] tracking-tight">
			{children}
		</h3>
	);
}

export function CardBody({ children }: { children: React.ReactNode }) {
	return <p className="text-muted-foreground text-sm/[23px]">{children}</p>;
}

export function MonoLabel({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<p
			className={cn(
				"select-none font-mono text-[#5A5A5A] text-[11px]/4 tracking-widest",
				className,
			)}
		>
			{children}
		</p>
	);
}
