export type SignedInHandler = (user: {
	id: string;
	email: string;
}) => void | Promise<void>;

const handlers: SignedInHandler[] = [];

export function onSignedIn(handler: SignedInHandler): void {
	handlers.push(handler);
}

export async function notifySignedIn(user: {
	id: string;
	email: string;
}): Promise<void> {
	for (const handler of handlers) {
		try {
			await handler(user);
		} catch (error) {
			console.error("[auth] a sign-in handler failed", error);
		}
	}
}
