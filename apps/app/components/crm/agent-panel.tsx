"use client";

import Checkmark from "@carbon/icons-react/es/Checkmark";
import CircleDash from "@carbon/icons-react/es/CircleDash";
import Document from "@carbon/icons-react/es/Document";
import LogoGithub from "@carbon/icons-react/es/LogoGithub";
import LogoLinkedin from "@carbon/icons-react/es/LogoLinkedin";
import Send from "@carbon/icons-react/es/Send";
import Warning from "@carbon/icons-react/es/Warning";
import {
	Attachment,
	AttachmentContent,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
	AttachmentTrigger,
} from "@crm/ui/components/attachment";
import { Bubble, BubbleContent } from "@crm/ui/components/bubble";
import { Button } from "@crm/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@crm/ui/components/empty";
import { type CarbonIcon, Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import Logo from "@crm/ui/components/logo";
import { Markdown } from "@crm/ui/components/markdown";
import { Marker, MarkerContent, MarkerIcon } from "@crm/ui/components/marker";
import {
	Message,
	MessageAvatar,
	MessageContent,
} from "@crm/ui/components/message";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@crm/ui/components/message-scroller";
import { Spinner } from "@crm/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEveAgent } from "eve/react";
import { useEffect, useRef, useState } from "react";
import {
	type Conversation,
	ConversationPicker,
	useConversations,
} from "@/components/crm/agent-conversations";
import {
	type AgentRecord,
	recordCopy,
	recordFilter,
	recordHeader,
} from "@/lib/agent-record";
import {
	composerState,
	eventsOf,
	loadThread,
	type Thread as ThreadState,
} from "@/lib/agent-session";
import {
	NEW_THREAD,
	pendingQuestion,
	resolveThread,
	type Source,
	type Tone,
	type TranscriptItem,
	toTranscript,
} from "@/lib/agent-transcript";
import { useTRPC } from "@/lib/trpc/client";
import { useRecordSheetView } from "./record-sheet/record-stack";

export function AgentPanel({ record }: { record: AgentRecord }) {
	const conversations = useConversations(recordFilter(record));
	const { thread, setThread } = useRecordSheetView("overview");

	const history = conversations.data ?? [];

	const landedOn = useRef<string | null>(null);
	if (landedOn.current === null && conversations.isSuccess) {
		landedOn.current = history[0]?.id ?? NEW_THREAD;
	}

	const { openId, current } = resolveThread({
		conversations: history,
		fromUrl: thread,
		landedOn: landedOn.current,
	});

	if (conversations.isPending) return <Loading />;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<ConversationPicker
				conversations={history}
				current={current}
				onSelect={(conversation) => setThread(conversation.id)}
				onNew={() => setThread(NEW_THREAD)}
				busy={false}
			/>

			<ThreadWithHistory
				key={openId ?? NEW_THREAD}
				record={record}
				conversation={current}
				onNewThread={() => setThread(NEW_THREAD)}
			/>
		</div>
	);
}

const WORKING_POLL_MS = 3000;

function ThreadWithHistory({
	record,
	conversation,
	onNewThread,
}: {
	record: AgentRecord;
	conversation: Conversation | null;
	onNewThread: () => void;
}) {
	const trpc = useTRPC();

	const archive = useQuery({
		...trpc.conversations.events.queryOptions({ id: conversation?.id ?? "" }),
		enabled: conversation !== null,
		staleTime: Number.POSITIVE_INFINITY,
	});

	const thread = useQuery<ThreadState>({
		queryKey: ["agent-thread", conversation?.sessionId],
		enabled: conversation !== null && !archive.isPending,
		staleTime: 0,
		refetchOnMount: "always",
		refetchOnWindowFocus: false,
		refetchInterval: (query) =>
			query.state.data?.status === "working" ? WORKING_POLL_MS : false,
		queryFn: ({ signal }) =>
			loadThread(
				conversation?.sessionId ?? "",
				recordHeader(record),
				(archive.data ?? []) as never,
				signal,
			),
	});

	if (conversation && (archive.isPending || thread.isPending))
		return <Loading />;

	return (
		<Thread
			key={thread.data?.status === "working" ? "working" : "settled"}
			record={record}
			conversation={conversation}
			thread={thread.data}
			onNewThread={onNewThread}
		/>
	);
}

function Loading() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<Spinner />
		</div>
	);
}

function Thread({
	record,
	conversation,
	thread,
	onNewThread,
}: {
	record: AgentRecord;
	conversation: Conversation | null;
	thread: ThreadState | undefined;
	onNewThread: () => void;
}) {
	const copy = recordCopy(record.kind);
	const agent = useEveAgent({
		headers: recordHeader(record),
		...(thread && "session" in thread
			? { initialSession: thread.session, initialEvents: eventsOf(thread) }
			: { initialEvents: eventsOf(thread) }),
	});
	const [draft, setDraft] = useState("");

	const opening = useRef<string | null>(conversation?.title ?? null);

	useSavedConversation({
		record: recordFilter(record),
		conversation,
		opening,
		session: agent.session ?? null,
		messages: agent.data.messages.length,
	});

	const busy = agent.status === "submitted" || agent.status === "streaming";
	const messages = toTranscript(agent.data.messages);
	const question = pendingQuestion(agent.data.messages);

	const { locked, ended } = composerState(thread, busy);

	const ask = (message: string) => {
		if (!message.trim() || locked) return;
		opening.current ||= message.trim();
		setDraft("");
		void agent.send({ message: message.trim() });
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<MessageScrollerProvider autoScroll defaultScrollPosition="end">
				<MessageScroller className="flex-1">
					<MessageScrollerViewport>
						<MessageScrollerContent className="gap-3 px-5 py-4">
							{messages.length === 0 && !busy ? (
								<Idle kind={record.kind} onAsk={ask} />
							) : null}

							{messages.map((message) => (
								<MessageScrollerItem key={message.id} messageId={message.id}>
									<div className="space-y-3">
										{message.items.map((item) => (
											<Item key={item.id} item={item} />
										))}
									</div>
								</MessageScrollerItem>
							))}

							{question ? (
								<MessageScrollerItem messageId={question.requestId}>
									<Question question={question} agent={agent} />
								</MessageScrollerItem>
							) : null}
						</MessageScrollerContent>
					</MessageScrollerViewport>

					<MessageScrollerButton />
				</MessageScroller>
			</MessageScrollerProvider>

			{agent.error ? <Failure message={agent.error.message} /> : null}

			{thread?.status === "working" && !busy ? (
				<p className="border-t px-5 py-2 text-muted-foreground text-xs">
					Still working on the last question. Your next one can go in when it
					finishes.
				</p>
			) : null}

			{ended ? (
				<div className="flex items-center justify-between gap-3 border-t px-5 py-2">
					<p className="text-muted-foreground text-xs">
						This conversation has ended.
					</p>
					<Button variant="outline" size="sm" onClick={onNewThread}>
						Start a new conversation
					</Button>
				</div>
			) : null}

			<form
				className="flex items-center gap-2 border-t px-5 py-3"
				onSubmit={(event) => {
					event.preventDefault();
					ask(draft);
				}}
			>
				<Input
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					placeholder={copy.placeholder}
					disabled={locked}
				/>
				<Button
					type="submit"
					size="icon-sm"
					variant="outline"
					disabled={locked}
				>
					{busy ? <Spinner /> : <Icon icon={Send} />}
					<span className="sr-only">Ask</span>
				</Button>
			</form>
		</div>
	);
}

function Idle({
	kind,
	onAsk,
}: {
	kind: AgentRecord["kind"];
	onAsk: (question: string) => void;
}) {
	const copy = recordCopy(kind);

	return (
		<Empty width="wide">
			<EmptyHeader>
				<EmptyMedia>
					<span className="flex size-8 items-center justify-center bg-foreground text-background">
						<Logo className="size-4" />
					</span>
				</EmptyMedia>
				<EmptyTitle>{copy.title}</EmptyTitle>
				<EmptyDescription>{copy.blurb}</EmptyDescription>
			</EmptyHeader>

			<EmptyContent layout="row">
				{copy.suggestions.map((suggestion) => (
					<Button
						key={suggestion}
						variant="outline"
						size="sm"
						onClick={() => onAsk(suggestion)}
					>
						{suggestion}
					</Button>
				))}
			</EmptyContent>
		</Empty>
	);
}

function Failure({ message }: { message: string }) {
	const hint = message.includes("not reachable")
		? "Start it with `bun run dev`, or check AGENT_URL."
		: message.includes("not configured")
			? "Set AGENT_BRIDGE_SECRET for both the app and the agent."
			: null;

	return (
		<div className="border-t px-5 py-3 text-xs">
			<p className="text-destructive">{message}</p>
			{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
		</div>
	);
}

const TONE_ICONS: Record<Tone, CarbonIcon> = {
	neutral: CircleDash,
	success: Checkmark,
	warning: Warning,
};

const SOURCE_ICONS: Record<Source["network"], CarbonIcon> = {
	linkedin: LogoLinkedin,
	github: LogoGithub,
	web: Document,
};

function Item({ item }: { item: TranscriptItem }) {
	if (item.kind === "said") {
		return item.mine ? (
			<Message align="end">
				<MessageContent>
					<Bubble variant="secondary" align="end">
						<BubbleContent>{item.text}</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		) : (
			<Message>
				<AgentAvatar />
				<MessageContent>
					<Bubble variant="ghost">
						<BubbleContent>
							<Markdown>{item.text}</Markdown>
						</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		);
	}

	return (
		<div className="space-y-1.5">
			<Marker>
				<MarkerIcon>
					{item.pending ? <Spinner /> : <Icon icon={TONE_ICONS[item.tone]} />}
				</MarkerIcon>
				<MarkerContent>{item.label}</MarkerContent>
			</Marker>

			{item.sources.length > 0 ? <Sources sources={item.sources} /> : null}
		</div>
	);
}

function Sources({ sources }: { sources: Source[] }) {
	return (
		<AttachmentGroup>
			{sources.map((source) => (
				<Attachment key={source.url} size="xs" state="done">
					<AttachmentMedia variant="icon">
						<Icon icon={SOURCE_ICONS[source.network]} />
					</AttachmentMedia>
					<AttachmentContent>
						<AttachmentTitle>{source.title}</AttachmentTitle>
					</AttachmentContent>

					<AttachmentTrigger asChild>
						<a href={source.url} target="_blank" rel="noreferrer noopener">
							<span className="sr-only">Open {source.title}</span>
						</a>
					</AttachmentTrigger>
				</Attachment>
			))}
		</AttachmentGroup>
	);
}

function AgentAvatar() {
	return (
		<MessageAvatar>
			<span className="flex size-7 items-center justify-center bg-foreground text-background">
				<Logo className="size-3.5" />
			</span>
		</MessageAvatar>
	);
}

function Question({
	question,
	agent,
}: {
	question: NonNullable<ReturnType<typeof pendingQuestion>>;
	agent: ReturnType<typeof useEveAgent>;
}) {
	return (
		<Message>
			<AgentAvatar />
			<MessageContent>
				<Bubble variant="tinted">
					<BubbleContent>{question.prompt}</BubbleContent>
				</Bubble>

				<div className="flex flex-wrap gap-2">
					{(question.options ?? []).map((option) => (
						<Button
							key={option.id}
							variant="outline"
							size="sm"
							onClick={() =>
								void agent.send({
									inputResponses: [
										{ requestId: question.requestId, optionId: option.id },
									],
								})
							}
						>
							{option.label}
						</Button>
					))}
				</div>
			</MessageContent>
		</Message>
	);
}

function useSavedConversation({
	record,
	conversation,
	opening,
	session,
	messages,
}: {
	record: { contactId?: string; companyId?: string; dealId?: string };
	conversation: Conversation | null;
	opening: React.RefObject<string | null>;
	session: {
		sessionId?: string;
		continuationToken?: string;
		streamIndex: number;
	} | null;
	messages: number;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const save = useMutation(trpc.conversations.save.mutationOptions({}));

	const sessionId = session?.sessionId ?? null;
	const token = session?.continuationToken ?? null;
	const streamIndex = session?.streamIndex ?? 0;
	const { contactId, companyId, dealId } = record;

	const isNew = conversation === null || conversation.sessionId !== sessionId;

	const latest = useRef({ save, queryClient, trpc, opening });
	latest.current = { save, queryClient, trpc, opening };

	const written = useRef<string | null>(null);

	useEffect(() => {
		if (!sessionId) return;

		const cursor = `${sessionId}:${token ?? ""}:${messages}`;
		if (written.current === cursor) return;
		written.current = cursor;

		const {
			save: mutation,
			queryClient: cache,
			trpc: api,
			opening: title,
		} = latest.current;

		mutation.mutate(
			{
				...(contactId ? { contactId } : {}),
				...(companyId ? { companyId } : {}),
				...(dealId ? { dealId } : {}),
				sessionId,
				continuationToken: token,
				streamIndex,
				messageCount: messages,
				...(isNew ? { title: title.current ?? undefined } : {}),
			},
			{
				onSuccess: () => {
					if (!isNew) return;
					void cache.invalidateQueries({
						queryKey: api.conversations.list.pathKey(),
					});
				},
			},
		);
	}, [
		sessionId,
		token,
		streamIndex,
		messages,
		contactId,
		companyId,
		dealId,
		isNew,
	]);
}
