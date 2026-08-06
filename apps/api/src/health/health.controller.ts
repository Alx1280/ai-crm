import type { Db } from "@crm/db";
import {
	Controller,
	Get,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { InjectDatabase } from "../database/database.constants";

const SLOW_PROBE_MS = 250;

@Controller("health")
export class HealthController {
	private readonly logger = new Logger(HealthController.name);

	constructor(@InjectDatabase() private readonly db: Db) {}

	@Get()
	@AllowAnonymous()
	async check() {
		const startedAt = process.hrtime.bigint();

		try {
			await this.db.$queryRaw`SELECT 1`;
		} catch (error) {
			this.logger.error(
				{ message: "Database health check failed" },
				error instanceof Error ? error.stack : String(error),
			);
			throw new ServiceUnavailableException({
				status: "error",
				database: "down",
			});
		}

		const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

		if (durationMs > SLOW_PROBE_MS) {
			this.logger.warn({
				message: "Database health check was slow",
				durationMs: Number(durationMs.toFixed(1)),
				thresholdMs: SLOW_PROBE_MS,
			});
		}

		return { status: "ok", database: "up" };
	}
}
