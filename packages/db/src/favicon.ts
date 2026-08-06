import {
	isBlockedAddress,
	resolvesToPublicHost,
	safeFetch,
} from "./safe-fetch";

export { isBlockedAddress, resolvesToPublicHost };

const TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 512_000;

const MAX_ICON_CANDIDATES = 10;

const ICON_REL = /^(shortcut )?icon$|^apple-touch-icon(-precomposed)?$/i;

function iconsFromHtml(html: string, base: URL): string[] {
	const found: { href: string; size: number }[] = [];

	for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
		const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.trim();
		if (!rel || !ICON_REL.test(rel)) continue;

		const href = /\bhref\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1]?.trim();
		if (!href) continue;

		const sizes = /\bsizes\s*=\s*["']?(\d+)/i.exec(tag)?.[1];

		try {
			found.push({
				href: new URL(href, base).toString(),
				size: Number(sizes ?? 0),
			});
		} catch {}
	}

	return found.sort((a, b) => b.size - a.size).map((icon) => icon.href);
}

async function readPage(url: URL): Promise<{ body: string; url: URL } | null> {
	const result = await safeFetch(url.toString(), { timeoutMs: TIMEOUT_MS });
	if (!result?.response.ok) return null;

	const { response } = result;
	if (!(response.headers.get("content-type") ?? "").includes("html")) {
		await response.body?.cancel();
		return null;
	}
	if (!response.body) return null;

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let body = "";
	let bytes = 0;

	try {
		while (bytes < MAX_HTML_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			body += decoder.decode(value, { stream: true });
		}
	} catch {
		return null;
	} finally {
		await reader.cancel().catch(() => {});
	}

	return { body, url: result.url };
}

async function servesImage(url: string): Promise<boolean> {
	const result = await safeFetch(url, {
		method: "HEAD",
		timeoutMs: TIMEOUT_MS,
	});
	if (!result?.response.ok) return false;

	await result.response.body?.cancel();
	return (result.response.headers.get("content-type") ?? "").startsWith(
		"image/",
	);
}

export async function resolveFavicon(
	domain: string | null | undefined,
): Promise<string | null> {
	if (!domain) return null;

	try {
		const base = new URL(`https://${domain}`);
		const page = await readPage(base);

		const candidates = page
			? iconsFromHtml(page.body, page.url).slice(0, MAX_ICON_CANDIDATES)
			: [];
		candidates.push(new URL("/favicon.ico", page?.url ?? base).toString());

		for (const candidate of candidates) {
			if (await servesImage(candidate)) return candidate;
		}
	} catch {}

	return null;
}
