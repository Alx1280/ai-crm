import { Injectable, Logger } from "@nestjs/common";
import type { OnErrorOptions, TRPCErrorHandler } from "nestjs-trpc";

@Injectable()
export class TrpcErrorHandler implements TRPCErrorHandler {
	private readonly logger = new Logger("tRPC");

	onError(opts: OnErrorOptions): void {
		const { error, type, path } = opts;
		const message = `${type} ${path ?? "<unknown>"} ${error.code}`;

		if (error.code === "INTERNAL_SERVER_ERROR") {
			this.logger.error(
				{ message, type, path, code: error.code },
				error.stack ?? String(error.cause ?? error),
			);
			return;
		}

		this.logger.warn({ message, type, path, code: error.code });
	}
}
