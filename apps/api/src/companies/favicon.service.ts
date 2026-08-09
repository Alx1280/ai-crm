import type { Db } from "@crm/db";
import { mirror } from "@crm/db/blob";
import { resolveFavicon } from "@crm/db/favicon";
import { Injectable, Logger } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";

@Injectable()
export class FaviconService {
	private readonly logger = new Logger(FaviconService.name);

	constructor(@InjectDatabase() private readonly db: Db) {}

	async backfill(companyId: string, domain: string | null): Promise<boolean> {
		try {
			const resolved = await resolveFavicon(domain);
			if (!resolved) return false;

			const iconUrl =
				(await mirror(resolved, `companies/${companyId}/icon`)) ?? resolved;

			const { count } = await this.db.company.updateMany({
				where: { id: companyId, iconUrl: null, domain },
				data: { iconUrl },
			});

			if (count > 0) {
				this.logger.log({ message: "Favicon resolved", companyId, iconUrl });
			}

			return count > 0;
		} catch (error) {
			this.logger.debug({
				message: "Favicon lookup failed",
				companyId,
				domain,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}
}
