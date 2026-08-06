import { PersonAvatar } from "@crm/ui/components/person-avatar";
import {
	type StatusTone,
	StatusIndicator,
} from "@crm/ui/components/status-indicator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@crm/ui/components/tooltip";
import { cn } from "@crm/ui/lib/utils";
import type * as React from "react";

export type Attendee = {
	id: string;
	email: string;
	name: string | null;
	responseStatus: string | null;
	isOrganizer: boolean;
	imageUrl?: string | null;
};

const RESPONSE_TONE: Record<string, StatusTone> = {
	accepted: "success",
	declined: "error",
	tentative: "warning",
	needsAction: "neutral",
};

const RESPONSE_LABEL: Record<string, string> = {
	accepted: "Accepted",
	declined: "Declined",
	tentative: "Maybe",
	needsAction: "No reply",
};

function AttendeeList({
	attendees,
	max = 5,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	attendees: readonly Attendee[];
	max?: number;
}) {
	if (attendees.length === 0) return null;

	const shown = attendees.slice(0, max);
	const overflow = attendees.length - shown.length;

	return (
		<div
			data-slot="attendee-list"
			className={cn("flex items-center gap-2", className)}
			{...props}
		>
			<div className="flex items-center gap-1">
				{shown.map((attendee) => (
					<Tooltip key={attendee.id}>
						<TooltipTrigger asChild>
							<PersonAvatar
								src={attendee.imageUrl}
								name={
									attendee.name?.trim() && !attendee.name.includes("@")
										? attendee.name
										: null
								}
								email={attendee.email}
								size="sm"
							/>
						</TooltipTrigger>
						<TooltipContent>
							<span className="flex items-center gap-2">
								{attendee.name ?? attendee.email}
								<StatusIndicator
									tone={RESPONSE_TONE[attendee.responseStatus ?? "needsAction"] ?? "neutral"}
									label={
										RESPONSE_LABEL[attendee.responseStatus ?? "needsAction"] ??
										"No reply"
									}
								/>
							</span>
						</TooltipContent>
					</Tooltip>
				))}
			</div>

			{overflow > 0 ? (
				<span className="text-muted-foreground text-xs">+{overflow}</span>
			) : null}
		</div>
	);
}

export { AttendeeList };
