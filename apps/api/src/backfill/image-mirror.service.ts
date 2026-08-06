import type { Db, Prisma } from "@crm/db";
import { blobEnabled, mirror } from "@crm/db/blob";
import { BLOB_HOST_SUFFIX, COMPANY_IMAGE_FIELDS } from "@crm/db/images";
import { Injectable, Logger } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";

const MAX_PER_SWEEP = 25;

export type ImageMirrorResult = {
	scanned: number;
	copied: number;
};

@Injectable()
export class ImageMirrorService {
	private readonly logger = new Logger(ImageMirrorService.name);

	constructor(@InjectDatabase() private readonly db: Db) {}

	async sweep(): Promise<ImageMirrorResult> {
		if (!blobEnabled()) return { scanned: 0, copied: 0 };

		const results = [
			await this.sweepCompanies(),
			await this.sweepContacts(),
			await this.sweepUsers(),
		];

		const total = results.reduce(
			(sum, result) => ({
				scanned: sum.scanned + result.scanned,
				copied: sum.copied + result.copied,
			}),
			{ scanned: 0, copied: 0 },
		);

		if (total.copied > 0) {
			this.logger.log({ message: "Mirrored external images", ...total });
		}

		return total;
	}

	private async sweepCompanies(): Promise<ImageMirrorResult> {
		const rows = await this.db.company.findMany({
			where: {
				OR: COMPANY_IMAGE_FIELDS.map((field) => external(field)),
			},
			orderBy: { createdAt: "asc" },
			take: MAX_PER_SWEEP,
			select: {
				id: true,
				logoUrl: true,
				logoDarkUrl: true,
				iconUrl: true,
				iconDarkUrl: true,
			},
		});

		let copied = 0;

		for (const row of rows) {
			const data: Prisma.CompanyUpdateInput = {};

			for (const field of COMPANY_IMAGE_FIELDS) {
				const current = row[field];
				if (!current) continue;

				const stored = await mirror(current, `companies/${row.id}/${field}`);
				if (!stored || stored === current) continue;

				data[field] = stored;
				copied += 1;
			}

			if (Object.keys(data).length === 0) continue;

			await this.db.company.updateMany({
				where: { id: row.id, ...unchanged(row) },
				data,
			});
		}

		return { scanned: rows.length, copied };
	}

	private async sweepContacts(): Promise<ImageMirrorResult> {
		const rows = await this.db.contact.findMany({
			where: external("imageUrl"),
			orderBy: { createdAt: "asc" },
			take: MAX_PER_SWEEP,
			select: { id: true, imageUrl: true },
		});

		let copied = 0;

		for (const row of rows) {
			if (!row.imageUrl) continue;

			const stored = await mirror(row.imageUrl, `contacts/${row.id}`);
			if (!stored || stored === row.imageUrl) continue;

			const { count } = await this.db.contact.updateMany({
				where: { id: row.id, imageUrl: row.imageUrl },
				data: { imageUrl: stored },
			});

			copied += count;
		}

		return { scanned: rows.length, copied };
	}

	private async sweepUsers(): Promise<ImageMirrorResult> {
		const rows = await this.db.user.findMany({
			where: external("image"),
			take: MAX_PER_SWEEP,
			select: { id: true, image: true },
		});

		let copied = 0;

		for (const row of rows) {
			if (!row.image) continue;

			const stored = await mirror(row.image, `users/${row.id}/avatar`);
			if (!stored || stored === row.image) continue;

			const { count } = await this.db.user.updateMany({
				where: { id: row.id, image: row.image },
				data: { image: stored },
			});

			copied += count;
		}

		return { scanned: rows.length, copied };
	}
}

function external<T extends string>(
	field: T,
): Record<T, { not: null }> & { NOT: Record<T, { contains: string }> } {
	return {
		...({ [field]: { not: null } } as Record<T, { not: null }>),
		NOT: { [field]: { contains: BLOB_HOST_SUFFIX } } as Record<
			T,
			{ contains: string }
		>,
	};
}

function unchanged(row: Record<string, unknown>): Prisma.CompanyWhereInput {
	return Object.fromEntries(
		COMPANY_IMAGE_FIELDS.map((field) => [field, row[field] ?? null]),
	);
}
