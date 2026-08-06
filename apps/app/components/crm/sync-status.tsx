import type { GoogleSyncStatus } from "@crm/db/enums";
import {
	StatusIndicator,
	type StatusTone,
} from "@crm/ui/components/status-indicator";

const PRESENTATION: Record<
	GoogleSyncStatus,
	{ label: string; tone: StatusTone; busy?: boolean }
> = {
	IDLE: { label: "Connected", tone: "success" },
	RUNNING: { label: "Syncing", tone: "info", busy: true },
	NEEDS_RECONNECT: { label: "Reconnect needed", tone: "warning" },
	FAILED: { label: "Sync failed", tone: "error" },
};

export function SyncIndicator({
	status,
	title,
	className,
}: {
	status: GoogleSyncStatus | null;
	title?: string | null;
	className?: string;
}) {
	if (status === null) {
		return (
			<StatusIndicator
				tone="neutral"
				label="Not connected"
				className={className}
			/>
		);
	}

	const { label, tone, busy } = PRESENTATION[status];

	return (
		<StatusIndicator
			tone={tone}
			busy={busy}
			label={label}
			title={title ?? undefined}
			className={className}
		/>
	);
}

export function isSyncing(status: GoogleSyncStatus | null): boolean {
	return status === "RUNNING";
}

export const SYNC_POLL_MS = 5_000;
