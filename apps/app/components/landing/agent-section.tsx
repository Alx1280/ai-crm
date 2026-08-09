import Add from "@carbon/icons-react/es/Add";
import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import ArrowUp from "@carbon/icons-react/es/ArrowUp";
import Attachment from "@carbon/icons-react/es/Attachment";
import ChevronDown from "@carbon/icons-react/es/ChevronDown";
import Renew from "@carbon/icons-react/es/Renew";
import Time from "@carbon/icons-react/es/Time";
import SlackLogo from "@crm/ui/components/brand-logos/slack";
import { cn } from "@crm/ui/lib/utils";
import Image from "next/image";
import type * as React from "react";
import { Chip } from "./chip";
import { SectionHeading } from "./section-heading";

export function AgentSection() {
	return (
		<section className="relative flex w-full shrink-0 flex-col items-center px-6 pt-20 md:pt-30">
			<div className="flex w-full max-w-6xl flex-col gap-12">
				<SectionHeading
					title="Agents that automate your CRM."
					lede="Describe how your CRM should act. Create agents to automate every process."
				/>

				<div className="flex w-full flex-col items-center gap-7 rounded-xl border border-border bg-background px-6 py-12 md:px-12 md:py-[88px]">
					<p className="text-balance text-center font-medium text-2xl/8 tracking-[-0.01em] md:text-[32px]/10">
						What should we get done, Lewis?
					</p>

					<Composer />
					<SuggestedActions />
				</div>
			</div>
		</section>
	);
}

function Composer() {
	return (
		<div className="flex min-h-24 w-3xl max-w-full shrink-0 select-none flex-col justify-between rounded-lg border border-[#3D3D3D] bg-muted p-[11px]">
			<p className="flex flex-wrap items-center gap-1 p-1 text-[13px]/6">
				<span className="text-[#00805E]">/Create agent</span>
				<span className="text-white">Send a new message to</span>
				<Chip className="gap-1 text-white">
					<SlackLogo className="size-[15px] shrink-0" />
					Slack
				</Chip>
				<span className="text-white">and ping</span>
				<Chip className="gap-1 text-white">
					<DanAvatar />
					Dan
				</Chip>
				<span className="text-white">
					when a company misses their invoice deadline
				</span>
			</p>

			<div className="flex items-center">
				<div className="flex items-center gap-[14px] text-muted-foreground">
					<Add size={16} />
					<Attachment size={16} />
					<span className="font-mono text-sm/4">/</span>
				</div>
				<div className="grow" />
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary">
					<ArrowUp size={14} className="text-primary-foreground" />
				</span>
			</div>
		</div>
	);
}

function SuggestedActions() {
	return (
		<div className="flex w-3xl max-w-full shrink-0 select-none flex-col pt-1">
			<div className="flex h-7 shrink-0 items-center gap-1.5 text-muted-foreground">
				<span className="text-[13px]/4">Suggested actions</span>
				<ChevronDown size={12} />
			</div>

			<SuggestedAction>
				<span className="shrink-0">Create a</span>
				<Chip>
					<SlackLogo className="size-[14px] shrink-0" />
					Slack
				</Chip>
				<span className="shrink-0">
					channel and invite the owner when a deal hits
				</span>
				<Chip className="gap-1.5 px-2">
					<span className="size-1.5 shrink-0 rounded-full bg-success" />
					Closed won
				</Chip>
			</SuggestedAction>

			<SuggestedAction className="gap-3">
				<span className="shrink-0">Ping</span>
				<Chip>
					<DanAvatar />
					Dan
				</Chip>
				<span className="min-w-0 grow">
					when a contract has been out five days unsigned
				</span>
			</SuggestedAction>

			<SuggestedAction>
				<span className="shrink-0">Every Monday,</span>
				<Chip className="px-2">
					<Renew size={13} className="shrink-0" />
					re-enrich contacts
				</Chip>
				<span className="shrink-0">that haven't been contacted in</span>
				<Chip className="px-2">
					<Time size={13} className="shrink-0 text-muted-foreground" />4 weeks
				</Chip>
			</SuggestedAction>
		</div>
	);
}

function SuggestedAction({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 border-border border-t py-[13px] text-[13px]/4">
			<span
				className={cn(
					"flex min-w-0 grow flex-wrap items-center gap-x-1.5 gap-y-2",
					className,
				)}
			>
				{children}
			</span>
			<ArrowRight size={16} className="shrink-0 text-muted-foreground" />
		</div>
	);
}

function DanAvatar() {
	return (
		<Image
			src="/landing/avatar-dan.png"
			alt=""
			width={64}
			height={64}
			className="size-[15px] shrink-0 rounded-full object-cover"
		/>
	);
}
