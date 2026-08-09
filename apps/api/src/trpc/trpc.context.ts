import { auth } from "@crm/auth";
import { Injectable } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { ContextOptions, TRPCContext } from "nestjs-trpc";
import type { BaseTrpcContext } from "./context.types";

@Injectable()
export class TrpcContext implements TRPCContext {
	async create(opts: ContextOptions): Promise<BaseTrpcContext> {
		const req = "req" in opts ? opts.req : undefined;
		const session = req
			? await auth.api
					.getSession({ headers: fromNodeHeaders(req.headers) })
					.catch(() => null)
			: null;
		return { req, session };
	}
}
