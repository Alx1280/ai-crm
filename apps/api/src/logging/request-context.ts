import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
	requestId: string;
	method: string;
	path: string;
	userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runInRequestContext<T>(
	context: RequestContext,
	fn: () => T,
): T {
	return storage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
	return storage.getStore();
}

export function setRequestUserId(userId: string): void {
	const context = storage.getStore();

	if (context) {
		context.userId = userId;
	}
}
