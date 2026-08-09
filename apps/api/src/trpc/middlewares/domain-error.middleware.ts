import { HttpException, Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import type {
	MiddlewareOptions,
	MiddlewareResponse,
	TRPCMiddleware,
} from "nestjs-trpc";

type TrpcErrorCode =
	| "BAD_REQUEST"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "TOO_MANY_REQUESTS"
	| "INTERNAL_SERVER_ERROR";

function statusToTrpcCode(status: number): TrpcErrorCode {
	switch (status) {
		case 400:
			return "BAD_REQUEST";
		case 401:
			return "UNAUTHORIZED";
		case 403:
			return "FORBIDDEN";
		case 404:
			return "NOT_FOUND";
		case 409:
			return "CONFLICT";
		case 429:
			return "TOO_MANY_REQUESTS";
		default:
			return "INTERNAL_SERVER_ERROR";
	}
}

@Injectable()
export class DomainErrorMiddleware implements TRPCMiddleware {
	async use(opts: MiddlewareOptions): Promise<MiddlewareResponse> {
		const result = await opts.next();

		if (result.ok) {
			return result;
		}

		const failure = result as { error?: unknown };
		const cause = (failure.error as { cause?: unknown } | undefined)?.cause;

		if (cause instanceof HttpException) {
			throw new TRPCError({
				code: statusToTrpcCode(cause.getStatus()),
				message: cause.message,
			});
		}

		return result;
	}
}
