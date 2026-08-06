export const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export const COMPANY_IMAGE_FIELDS = [
	"logoUrl",
	"logoDarkUrl",
	"iconUrl",
	"iconDarkUrl",
] as const;

export type CompanyImageField = (typeof COMPANY_IMAGE_FIELDS)[number];

const OPTIMIZABLE = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

export function isMirrored(url: string | null | undefined): boolean {
	if (!url) return false;
	try {
		return new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX);
	} catch {
		return false;
	}
}

export function isOptimizable(url: string | null | undefined): boolean {
	if (!isMirrored(url) || !url) return false;

	try {
		const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
		return extension !== undefined && OPTIMIZABLE.has(extension);
	} catch {
		return false;
	}
}
