import type { MessageStreamEvent, SessionState } from "eve/client";
import { Client } from "eve/client";

const ABANDONED_AFTER_MS = 90_000;

export type Thread =
	| {
			status: "new";
	  }
	| {
			status: "ready";
			session: SessionState;
			events: readonly MessageStreamEvent[];
	  }
	| {
			status: "working";
			session: SessionState;
			events: readonly MessageStreamEvent[];
	  }
	| {
			status: "ended";
			session: SessionState;
			events: readonly MessageStreamEvent[];
	  }
	| {
			status: "offline";
			events: readonly MessageStreamEvent[];
	  };

export async function loadThread(
	sessionId: string,
	headers: Record<string, string>,
	archive: readonly MessageStreamEvent[] = [],
	signal?: AbortSignal,
): Promise<Thread> {
	try {
		const snapshot = await new Client({ headers, host: "" })
			.session({ sessionId, streamIndex: 0 })
			.snapshot({ signal });

		return {
			status: classify(snapshot.session, snapshot.events),
			session: snapshot.session,
			events: snapshot.events,
		} as Thread;
	} catch {
		return { status: "offline", events: archive };
	}
}

export function classify(
	session: SessionState,
	events: readonly MessageStreamEvent[],
	now: number = Date.now(),
): "ready" | "working" | "ended" {
	if (session.continuationToken) return "ready";

	const last = events.at(-1);
	if (!last) return "ended";

	if (last.type === "session.completed" || last.type === "session.failed") {
		return "ended";
	}

	const at = Date.parse(last.meta.at);

	return Number.isNaN(at) || now - at < ABANDONED_AFTER_MS
		? "working"
		: "ended";
}

export function eventsOf(
	thread: Thread | undefined,
): readonly MessageStreamEvent[] {
	return thread && "events" in thread ? thread.events : [];
}

export type ComposerState = {
	locked: boolean;
	ended: boolean;
};

export function composerState(
	thread: Thread | undefined,
	busy: boolean,
): ComposerState {
	const ended = thread?.status === "ended";

	return {
		ended,
		locked: busy || ended || thread?.status === "working",
	};
}
