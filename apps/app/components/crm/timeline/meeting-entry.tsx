"use client";

import { AttendeeList } from "@crm/ui/components/attendee-list";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

const rangeFormat = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

const timeOnly = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
});

const dayOnly = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
});

export function MeetingEntry({
	eventId,
	startsAt,
	endsAt,
	isAllDay,
	attendeeCount,
	conferenceUrl,
}: {
	eventId: string;
	startsAt: string;
	endsAt: string;
	isAllDay: boolean;
	attendeeCount: number;
	conferenceUrl: string | null;
}) {
	const trpc = useTRPC();

	const event = useQuery({
		...trpc.google.event.queryOptions({ eventId }),
		enabled: attendeeCount > 0,
	});

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
			<span className="text-muted-foreground text-xs">
				{formatRange(startsAt, endsAt, isAllDay)}
			</span>

			{event.data?.attendees && event.data.attendees.length > 0 ? (
				<AttendeeList attendees={event.data.attendees} />
			) : null}

			{conferenceUrl ? (
				<a
					href={conferenceUrl}
					target="_blank"
					rel="noreferrer"
					className="text-muted-foreground text-xs underline underline-offset-3 hover:text-foreground"
				>
					Join call
				</a>
			) : null}
		</div>
	);
}

function formatRange(
	startsAt: string,
	endsAt: string,
	isAllDay: boolean,
): string {
	const start = new Date(startsAt);
	const end = new Date(endsAt);

	if (isAllDay) return `${dayOnly.format(start)} · All day`;

	const sameDay = start.toDateString() === end.toDateString();

	return sameDay
		? `${rangeFormat.format(start)} – ${timeOnly.format(end)}`
		: `${rangeFormat.format(start)} – ${rangeFormat.format(end)}`;
}
