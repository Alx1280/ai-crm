import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { getRequestContext } from "./request-context";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger("ExceptionsHandler");

	catch(exception: unknown, host: ArgumentsHost): void {
		if (host.getType() !== "http") {
			throw exception;
		}

		const http = host.switchToHttp();
		const request = http.getRequest<Request>();
		const response = http.getResponse<Response>();

		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;
		const requestId = getRequestContext()?.requestId;

		this.log(exception, status, request);

		if (response.headersSent) {
			return;
		}

		response.status(status).json(body(exception, status, requestId));
	}

	private log(exception: unknown, status: number, request: Request): void {
		const payload = {
			message: describe(exception),
			method: request.method,
			path: request.originalUrl,
			statusCode: status,
			exception: exception?.constructor?.name,
		};

		if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
			this.logger.error(
				payload,
				exception instanceof Error ? exception.stack : undefined,
			);
			return;
		}

		this.logger.debug(payload);
	}
}

function describe(exception: unknown): string {
	if (exception instanceof Error) {
		return exception.message;
	}

	return typeof exception === "string" ? exception : "Unknown exception";
}

function body(
	exception: unknown,
	status: number,
	requestId: string | undefined,
): Record<string, unknown> {
	const withRequestId = requestId ? { requestId } : {};

	if (!(exception instanceof HttpException)) {
		return {
			statusCode: status,
			message: "Internal server error",
			...withRequestId,
		};
	}

	const original = exception.getResponse();

	if (typeof original === "string") {
		return { statusCode: status, message: original, ...withRequestId };
	}

	return { ...(original as Record<string, unknown>), ...withRequestId };
}
