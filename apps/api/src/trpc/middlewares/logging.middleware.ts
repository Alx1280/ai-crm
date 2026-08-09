import { Injectable, Logger } from "@nestjs/common";
import type {
	MiddlewareOptions,
	MiddlewareResponse,
	TRPCMiddleware,
} from "nestjs-trpc";

@Injectable()
export class LoggingMiddleware implements TRPCMiddleware {
	private readonly logger = new Logger("tRPC");

	async use(opts: MiddlewareOptions): Promise<MiddlewareResponse> {
		const startedAt = Date.now();
		const result = await opts.next();
		const durationMs = Date.now() - startedAt;

		this.logger.log({
			message: `${opts.type} ${opts.path} ${result.ok ? "ok" : "err"} ${durationMs}ms`,
			type: opts.type,
			path: opts.path,
			outcome: result.ok ? "ok" : "err",
			durationMs,
		});

		return result;
	}
}
