const HOST = "linkdapi-best-unofficial-linkedin-api.p.rapidapi.com";
const TIMEOUT_MS = 20_000;

export type Profile = {
	slug: string;
	profileUrl: string;
	fullName: string | null;
	firstName: string | null;
	lastName: string | null;
	headline: string | null;
	location: string | null;
	urn: string | null;
	followerCount: number | null;
	connectionsCount: number | null;
	photoUrl: string | null;
	positions: { name: string; url: string | null }[];
};

export type Company = {
	id: string | null;
	name: string | null;
	universalName: string | null;
	tagline: string | null;
	description: string | null;
	linkedinUrl: string | null;
};

export type Experience = {
	title: string | null;
	company: string | null;
	dateRange: string | null;
	location: string | null;
};

type Outcome<T> =
	| { ok: true; data: T }
	| { ok: false; missing: true }
	| { ok: false; missing: false; reason: string };

function key(): string | null {
	return process.env.RAPIDAPI_KEY ?? null;
}

export function linkedinEnabled(): boolean {
	return key() !== null;
}

export function slugFromProfileUrl(raw: string | null): string | null {
	if (!raw) return null;

	try {
		const url = new URL(raw.trim());

		const host = url.hostname.toLowerCase();
		if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;

		const [section, slug] = url.pathname.split("/").filter(Boolean);
		if (section !== "in" || !slug) return null;

		return decodeURIComponent(slug);
	} catch {
		return null;
	}
}

export async function getProfile(slug: string): Promise<Outcome<Profile>> {
	const result = await call<RawProfile>("/api/v1/profile/overview", {
		username: slug,
	});
	if (!result.ok) return result;

	const d = result.data;
	return {
		ok: true,
		data: {
			slug,
			profileUrl: `https://www.linkedin.com/in/${slug}`,
			fullName: str(d.fullName),
			firstName: str(d.firstName),
			lastName: str(d.lastName),
			headline: str(d.headline),
			location: str(d.location),
			urn: str(d.urn),
			followerCount: int(d.followerCount),
			connectionsCount: int(d.connectionsCount),
			photoUrl: profilePhotoUrl(d),
			positions: (d.CurrentPositions ?? []).flatMap((p) =>
				p?.name ? [{ name: p.name, url: str(p.url) }] : [],
			),
		},
	};
}

export async function getExperience(
	urn: string,
): Promise<Outcome<Experience[]>> {
	const result = await call<RawExperience>("/api/v1/profile/full-experience", {
		urn,
	});
	if (!result.ok) return result;

	const payload = result.data;
	const rows: RawExperienceRow[] = Array.isArray(payload)
		? payload
		: (payload.experience ?? payload.experiences ?? []);

	return {
		ok: true,
		data: rows.map(
			(row): Experience => ({
				title: str(row?.title),
				company: str(row?.companyName ?? row?.company),
				dateRange: str(row?.dateRange ?? row?.duration),
				location: str(row?.location),
			}),
		),
	};
}

export async function lookupCompany(
	query: string,
): Promise<Outcome<{ id: string; displayName: string }[]>> {
	const result = await call<RawLookup>("/api/v1/companies/name-lookup", {
		query,
	});
	if (!result.ok) return result;

	return {
		ok: true,
		data: (result.data.companies ?? []).flatMap((c) =>
			c?.id ? [{ id: c.id, displayName: c.displayName ?? c.id }] : [],
		),
	};
}

export async function getCompany(nameOrId: string): Promise<Outcome<Company>> {
	const numeric = /^\d+$/.test(nameOrId);
	const result = await call<RawCompany>("/api/v1/companies/company/info", {
		[numeric ? "id" : "name"]: nameOrId,
	});
	if (!result.ok) return result;

	const d = result.data;
	return {
		ok: true,
		data: {
			id: str(d.id),
			name: str(d.name),
			universalName: str(d.universalName),
			tagline: str(d.tagline),
			description: str(d.description),
			linkedinUrl: str(d.linkedinUrl),
		},
	};
}

async function call<T>(
	path: string,
	params: Record<string, string>,
): Promise<Outcome<T>> {
	const apiKey = key();
	if (!apiKey) return { ok: false, missing: false, reason: "No RAPIDAPI_KEY." };

	const url = new URL(`https://${HOST}${path}`);
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": apiKey },
			signal: controller.signal,
		});

		if (!response.ok) {
			return { ok: false, missing: false, reason: `HTTP ${response.status}` };
		}

		const body = (await response.json()) as {
			success?: boolean;
			data?: T | null;
		};

		if (body.success !== true || body.data == null) {
			return { ok: false, missing: true };
		}

		return { ok: true, data: body.data };
	} catch (error) {
		const aborted = error instanceof Error && error.name === "AbortError";
		return {
			ok: false,
			missing: false,
			reason: aborted
				? `Timed out after ${TIMEOUT_MS}ms.`
				: error instanceof Error
					? error.message
					: String(error),
		};
	} finally {
		clearTimeout(timer);
	}
}

type RawProfile = {
	fullName?: unknown;
	firstName?: unknown;
	lastName?: unknown;
	headline?: unknown;
	location?: unknown;
	urn?: unknown;
	followerCount?: unknown;
	connectionsCount?: unknown;
	CurrentPositions?: { name?: string; url?: unknown }[] | null;
} & Record<string, unknown>;

const PHOTO_KEYS = [
	"profilePictureURL",
	"profilePicture",
	"profilePictureUrl",
	"profilePicUrl",
	"profilePic",
	"profilePicHighQuality",
	"profilePhotoUrl",
	"profilePhoto",
	"pictureUrl",
	"avatarUrl",
	"avatar",
];

export function profilePhotoUrl(raw: Record<string, unknown>): string | null {
	const byLowerKey = new Map<string, unknown>();
	for (const [key, value] of Object.entries(raw)) {
		byLowerKey.set(key.toLowerCase(), value);
	}

	for (const key of PHOTO_KEYS) {
		const url = firstUrl(byLowerKey.get(key.toLowerCase()));
		if (!url) continue;

		try {
			const { protocol, hostname } = new URL(url);
			if (protocol !== "https:") continue;
			if (hostname !== "licdn.com" && !hostname.endsWith(".licdn.com"))
				continue;
			return url;
		} catch {}
	}

	return null;
}

function firstUrl(value: unknown): string | null {
	if (typeof value === "string") return str(value);

	if (Array.isArray(value)) {
		for (const entry of [...value].reverse()) {
			const found = firstUrl(entry);
			if (found) return found;
		}
		return null;
	}

	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		for (const key of ["url", "displayUrl", "src", "large", "original"]) {
			const found = firstUrl(record[key]);
			if (found) return found;
		}
	}

	return null;
}

type RawExperienceRow = {
	title?: unknown;
	companyName?: unknown;
	company?: unknown;
	dateRange?: unknown;
	duration?: unknown;
	location?: unknown;
};

type RawExperience =
	| RawExperienceRow[]
	| { experience?: RawExperienceRow[]; experiences?: RawExperienceRow[] };
type RawLookup = { companies?: { id?: string; displayName?: string }[] | null };
type RawCompany = {
	id?: unknown;
	name?: unknown;
	universalName?: unknown;
	tagline?: unknown;
	description?: unknown;
	linkedinUrl?: unknown;
};

function str(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function int(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}
