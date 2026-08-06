import dns from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 3;

const DEFAULT_TIMEOUT_MS = 5_000;

export function isBlockedAddress(ip: string): boolean {
	const groups = ip.includes(":") ? expandIPv6(ip) : null;

	if (groups) {
		const marker = groups[5];
		if (
			groups.slice(0, 5).every((group) => group === 0) &&
			(marker === 0xffff || marker === 0)
		) {
			const high = groups[6] ?? 0;
			return isBlockedIPv4(high >> 8, high & 0xff);
		}

		const first = groups[0] ?? 0;
		return (
			(first & 0xfe00) === 0xfc00 ||
			(first & 0xffc0) === 0xfe80 ||
			(first & 0xff00) === 0xff00
		);
	}

	if (net.isIPv4(ip)) {
		const [a = 0, b = 0] = ip.split(".").map(Number);
		return isBlockedIPv4(a, b);
	}

	return true;
}

function isBlockedIPv4(a: number, b: number): boolean {
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 198 && (b === 18 || b === 19)) ||
		a >= 224
	);
}

function expandIPv6(ip: string): number[] | null {
	let text = (ip.split("%")[0] ?? "").toLowerCase();

	const embedded: number[] = [];
	const lastColon = text.lastIndexOf(":");
	const tail = text.slice(lastColon + 1);
	if (tail.includes(".")) {
		if (!net.isIPv4(tail)) return null;
		const [a = 0, b = 0, c = 0, d = 0] = tail.split(".").map(Number);
		embedded.push((a << 8) | b, (c << 8) | d);
		text = text.slice(0, lastColon + 1);
	}

	const [headText = "", runText, extra] = text.split("::");
	if (extra !== undefined) return null;

	const parse = (part: string) =>
		part
			.split(":")
			.filter((group) => group !== "")
			.map((group) =>
				/^[0-9a-f]{1,4}$/.test(group) ? Number.parseInt(group, 16) : Number.NaN,
			);

	const head = parse(headText);
	const run = runText === undefined ? [] : parse(runText);
	const missing = 8 - head.length - run.length - embedded.length;
	if (runText !== undefined && missing < 0) return null;

	const fill = runText === undefined ? [] : Array<number>(missing).fill(0);
	const groups = [...head, ...fill, ...run, ...embedded];
	if (groups.length !== 8 || groups.some((group) => Number.isNaN(group)))
		return null;

	return groups;
}

export async function resolvesToPublicHost(
	hostname: string,
	timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
	const literal = hostname.replace(/^\[|\]$/g, "");
	if (net.isIP(literal)) return !isBlockedAddress(literal);

	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const addresses = await Promise.race([
			dns.lookup(hostname, { all: true }),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error(`${hostname} did not resolve in time`)),
					timeoutMs,
				);
			}),
		]);

		return (
			addresses.length > 0 &&
			addresses.every((address) => !isBlockedAddress(address.address))
		);
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
}

export async function safeFetch(
	url: string,
	{
		method = "GET",
		timeoutMs = DEFAULT_TIMEOUT_MS,
		headers,
	}: {
		method?: "GET" | "HEAD";
		timeoutMs?: number;
		headers?: Record<string, string>;
	} = {},
): Promise<{ response: Response; url: URL } | null> {
	let target: URL;
	try {
		target = new URL(url);
	} catch {
		return null;
	}

	for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
		if (target.protocol !== "https:" && target.protocol !== "http:")
			return null;
		if (!(await resolvesToPublicHost(target.hostname, timeoutMs))) return null;

		let response: Response;
		try {
			response = await fetch(target, {
				method,
				signal: AbortSignal.timeout(timeoutMs),
				redirect: "manual",
				headers: {
					"user-agent": "Mozilla/5.0 (compatible; CRM/1.0)",
					...headers,
				},
			});
		} catch {
			return null;
		}

		const location = response.headers.get("location");
		if (response.status >= 300 && response.status < 400 && location) {
			await response.body?.cancel();
			try {
				target = new URL(location, target);
			} catch {
				return null;
			}
			continue;
		}

		return { response, url: target };
	}

	return null;
}
