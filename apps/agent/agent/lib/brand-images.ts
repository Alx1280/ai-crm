import type { Prisma } from "@crm/db";
import { blobEnabled, mirror } from "@crm/db/blob";
import { COMPANY_IMAGE_FIELDS } from "@crm/db/images";

export async function mirrorBrandImages(
	companyId: string,
	update: Prisma.CompanyUpdateInput,
): Promise<{ update: Prisma.CompanyUpdateInput; mirrored: string[] }> {
	if (!blobEnabled()) return { update, mirrored: [] };

	const mirrored: string[] = [];

	await Promise.all(
		COMPANY_IMAGE_FIELDS.map(async (slot) => {
			const source = plain(update[slot]);
			if (!source) return;

			const stored = await mirror(source, `companies/${companyId}/${slot}`);
			if (!stored || stored === source) return;

			update[slot] = stored;
			mirrored.push(slot);
		}),
	);

	return { update, mirrored };
}

function plain(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value : null;
}
