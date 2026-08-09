import { db } from "@crm/db";
import { blobEnabled, isMirrored, mirror } from "@crm/db/blob";
import { COMPANY_IMAGE_FIELDS } from "@crm/db/images";
import { brandToUpdate } from "../agent/lib/brand-mapping";

if (!blobEnabled()) {
	console.warn(
		"No BLOB_READ_WRITE_TOKEN — icon tone and dark artwork will still be " +
			"filled in, but nothing will be copied into Blob.",
	);
}

const rows = await db.companyEnrichment.findMany({
	select: {
		companyId: true,
		raw: true,
		company: {
			select: {
				name: true,
				description: true,
				logoUrl: true,
				logoDarkUrl: true,
				iconUrl: true,
				iconDarkUrl: true,
				iconTone: true,
				brandColor: true,
				industry: true,
				subIndustry: true,
				city: true,
				stateCode: true,
				country: true,
				countryCode: true,
				phone: true,
				email: true,
				linkedinUrl: true,
				twitterUrl: true,
				githubUrl: true,
				pricingUrl: true,
				careersUrl: true,
			},
		},
	},
});

let updated = 0;
let copied = 0;

for (const row of rows) {
	const brand = (row.raw as { brand?: unknown } | null)?.brand;
	if (!brand) continue;

	const update = brandToUpdate(brand as never, {
		...row.company,
		nameIsPlaceholder: false,
	});

	const patch: Record<string, string> = {
		...(typeof update.iconDarkUrl === "string"
			? { iconDarkUrl: update.iconDarkUrl }
			: {}),
		...(typeof update.iconTone === "string"
			? { iconTone: update.iconTone }
			: {}),
	};

	for (const slot of COMPANY_IMAGE_FIELDS) {
		const current = row.company[slot];
		if (!current || isMirrored(current)) continue;

		const stored = await mirror(current, `companies/${row.companyId}/${slot}`);
		if (!stored || stored === current) continue;

		patch[slot] = stored;
		copied += 1;
	}

	if (Object.keys(patch).length === 0) continue;

	await db.company.update({ where: { id: row.companyId }, data: patch });
	updated += 1;
	console.log(`${row.company.name}: ${Object.keys(patch).join(", ")}`);
}

console.log(
	`\nUpdated ${updated} of ${rows.length} enriched companies. Copied ${copied} images.`,
);
await db.$disconnect();
